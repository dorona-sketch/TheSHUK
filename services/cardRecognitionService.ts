
import { IdentificationResult, CardCandidate, PokemonType, CardCategory, VariantTag, CardTypeTag, CategoryTag } from '../types';
import { cropImageCorners, binarizeBase64, extractIDStrips, computeDHash, calculateHammingDistance } from '../utils/imageProcessing';
import { performOcrOnCorners, identifyCardFromImage } from './geminiService';
import { searchCardByCollectorNumber, getCardPrice, fetchSetChaseCard } from './tcgApiService';


const scoreIdMatch = (candidateNumber?: string, rawId?: string): number => {
    if (!candidateNumber || !rawId) return 0;

    const normalizedCandidate = candidateNumber.toUpperCase().replace(/\s+/g, '');
    const normalizedRaw = rawId.toUpperCase().replace(/\s+/g, '');

    if (!normalizedCandidate || !normalizedRaw) return 0;
    if (normalizedCandidate === normalizedRaw) return 1;

    const rawFraction = normalizedRaw.match(/^(\d+)\/(\d+)$/);
    if (rawFraction && normalizedCandidate === String(Number(rawFraction[1]))) return 0.8;

    const numericPart = normalizedRaw.match(/([A-Z]{0,4})(\d+)/);
    if (numericPart) {
        const candidateNum = normalizedCandidate.match(/([A-Z]{0,4})(\d+)/);
        if (candidateNum && String(Number(candidateNum[2])) === String(Number(numericPart[2]))) {
            return candidateNum[1] === numericPart[1] ? 0.7 : 0.55;
        }
    }

    return 0;
};

const rankCandidates = (candidates: CardCandidate[], rawId?: string): CardCandidate[] => {
    const ranked = [...candidates].map(c => {
        const idScore = scoreIdMatch(c.number, rawId);
        const visualScore = c.visualSimilarity ?? 0;
        const baseConfidence = c.confidence ?? 0.6;
        const confidence = Math.max(baseConfidence, Math.min(0.98, (baseConfidence * 0.45) + (idScore * 0.4) + (visualScore * 0.15)));
        return { ...c, confidence };
    });

    ranked.sort((a, b) => {
        const confDiff = (b.confidence || 0) - (a.confidence || 0);
        if (Math.abs(confDiff) > 0.001) return confDiff;
        const priceDiff = (b.priceEstimate || 0) - (a.priceEstimate || 0);
        if (Math.abs(priceDiff) > 0.001) return priceDiff;
        return (a.cardName || '').localeCompare(b.cardName || '');
    });

    return ranked;
};

const dedupeCandidates = (candidates: CardCandidate[]): CardCandidate[] => {
    const byKey = new Map<string, CardCandidate>();
    candidates.forEach(c => {
        const key = `${c.id || c.cardName}-${c.number || ''}-${c.variant || ''}`.toLowerCase();
        const existing = byKey.get(key);
        if (!existing || (c.confidence || 0) > (existing.confidence || 0)) {
            byKey.set(key, c);
        }
    });
    return Array.from(byKey.values());
};

export const CardRecognitionService = {

    /**
     * MAIN PIPELINE
     * 1. Pre-process: Binarize corners for OCR (Input assumed to be card ROI).
     * 2. OCR: Extract ID (e.g. "001/165", "TG13/TG30", "SWSH123").
     * 3. API Lookup: Fetch candidates by ID logic.
     * 4. Map & Expand Variants: Explode API results into specific variants (Normal, Reverse Holo) with Pricing.
     * 5. Tie-Break: ROI Strip dHash comparison (BL/BR) if variants ambiguous visually.
     * 6. Visual AI Fallback: If OCR fails, ask Gemini to identify card by image.
     */
    async identify(base64Image: string, mimeType: string = 'image/jpeg'): Promise<IdentificationResult> {
        console.group("CardRecognition Pipeline");
        console.time("Total Pipeline Time");

        const isDataUrl = base64Image.startsWith('data:');
        const normalizedBase64 = isDataUrl ? (base64Image.split(',')[1] || '') : base64Image;
        
        // 1. Image Pre-processing for OCR
        console.log("Stage 1: Pre-processing (Assumes ROI)...");
        // NOTE: We do NOT call autoCropCard here anymore. 
        // The UI handles cropping (auto or manual) before calling identify.
        // We assume `base64Image` is the best available crop.

        const { leftCorner, rightCorner } = await cropImageCorners(normalizedBase64);
        
        const [binaryLeft, binaryRight] = await Promise.all([
            binarizeBase64(leftCorner),
            binarizeBase64(rightCorner)
        ]);

        // 2. OCR Stage
        console.log("Stage 2: Calling OCR...");
        const [binaryOcrResult, rawOcrResult] = await Promise.all([
            performOcrOnCorners(binaryLeft, binaryRight),
            performOcrOnCorners(leftCorner, rightCorner)
        ]);
        const ocrResult = (binaryOcrResult.confidence >= rawOcrResult.confidence)
            ? binaryOcrResult
            : rawOcrResult;
        console.log("OCR Result:", ocrResult);

        let candidates: any[] = [];
        
        // Clean up OCR spacing & Common Char replacements (O->0, I->1, etc)
        let rawId = (ocrResult.normalized || '').replace(/\s+/g, '').toUpperCase();
        rawId = rawId.replace(/[\\|]/g, '/').replace(/[^A-Z0-9\/-]/g, '');
        
        // Heuristic character fix for numbers (often OCR reads 058 as O58)
        rawId = rawId.replace(/O/g, '0').replace(/[Il]/g, '1');

        // 3. API Lookup Stage (Parsing Logic)
        if (rawId && ocrResult.confidence > 0.4) {
            console.log("Stage 3: Parsing ID", rawId);
            
            const subsetFullMatch = rawId.match(/^([A-Z]{1,4})(\d+)\/([A-Z]{1,4})?(\d+)$/);
            const subsetMixedMatch = rawId.match(/^([A-Z]{1,3})(\d+)\/(\d+)$/);
            const fractionMatch = rawId.match(/^(\d+)\/(\d+)([A-Z]+)?$/);
            const promoMatch = rawId.match(/^([A-Z]{2,5})[-]?(\d+)$/);

            try {
                if (subsetFullMatch) {
                    const prefix = subsetFullMatch[1];
                    const num = subsetFullMatch[2];
                    const fullId = `${prefix}${num}`;
                    candidates = await searchCardByCollectorNumber(fullId, undefined, prefix);
                } else if (subsetMixedMatch) {
                    const prefix = subsetMixedMatch[1];
                    const num = subsetMixedMatch[2];
                    const fullId = `${prefix}${num}`;
                    const total = subsetMixedMatch[3];
                    candidates = await searchCardByCollectorNumber(fullId, total, prefix);
                } else if (fractionMatch) {
                    const number = fractionMatch[1];
                    const total = fractionMatch[2];
                    candidates = await searchCardByCollectorNumber(number, total);
                } else if (promoMatch) {
                    const prefix = promoMatch[1];
                    candidates = await searchCardByCollectorNumber(rawId, undefined, prefix);
                } else {
                    candidates = await searchCardByCollectorNumber(rawId);
                }

                // Retry with de-zeroed number when OCR returns e.g. 058/102 but API has 58/102.
                if (candidates.length === 0) {
                    const fractionRetry = rawId.match(/^(\d+)\/(\d+)$/);
                    if (fractionRetry) {
                        const strippedNum = String(Number(fractionRetry[1]));
                        if (strippedNum && strippedNum !== fractionRetry[1]) {
                            candidates = await searchCardByCollectorNumber(strippedNum, fractionRetry[2]);
                        }
                    }
                }
            } catch (e) {
                console.error("API Search Error", e);
            }
        } else {
            console.warn("OCR Confidence too low or ID empty.");
        }

        console.log(`Stage 3 Complete: Found ${candidates.length} API Candidates (pre-expansion)`);

        // 4. Map & Expand Variants (Handles Rarity & Pricing)
        let finalCandidates: CardCandidate[] = [];
        candidates.forEach(apiCard => {
            const variants = expandVariants(apiCard);
            finalCandidates.push(...variants);
        });

        // --- VISUAL AI FALLBACK ---
        // If API lookup returned nothing (or OCR failed), ask Gemini to identify the card visually
        if (finalCandidates.length === 0) {
            console.log("Stage 3.5: Fallback to Visual AI...");
            const aiData = await identifyCardFromImage(normalizedBase64);
            
            if (aiData && aiData.cardName) {
                // Try to find it in API via name + number (if available) to get pricing metadata
                let verifyCandidates: any[] = [];
                if (aiData.number) {
                    verifyCandidates = await searchCardByCollectorNumber(aiData.number);
                    // Filter by name roughly
                    verifyCandidates = verifyCandidates.filter(c => c.name.toLowerCase().includes(aiData.cardName.toLowerCase()));
                }
                
                if (verifyCandidates.length > 0) {
                    verifyCandidates.forEach(apiCard => {
                        finalCandidates.push(...expandVariants(apiCard));
                    });
                } else {
                    // Manual Candidate from AI Data (if API fails completely)
                    finalCandidates.push({
                        cardName: aiData.cardName,
                        pokemonName: aiData.cardName,
                        setName: aiData.setName,
                        number: aiData.number,
                        rarity: aiData.rarity,
                        confidence: 0.7, // Visual AI confidence default
                        matchSource: 'visual_ai',
                        language: 'English',
                        releaseYear: '',
                        condition: 'Near Mint'
                    });
                }
            }
        }

        // 5. Chase Analysis (Parallelized for Speed)
        await Promise.all(finalCandidates.map(async (candidate) => {
            const chaseInfo = await this.analyzeChaseStatus(candidate);
            candidate.isChase = chaseInfo.isChase;
            if(candidate.isChase) console.log("CHASE CARD FOUND:", candidate.cardName);
        }));

        // 6. Tie-Break Stage (ROI Strip Signature)
        if (finalCandidates.length > 1) {
            console.log("Stage 4: Ambiguous matches detected. Running Visual Tie-Break...");
            const userImageUrl = isDataUrl ? base64Image : `data:${mimeType};base64,${normalizedBase64}`;
            finalCandidates = await this.performVisualTieBreak(userImageUrl, finalCandidates);
        }

        finalCandidates = rankCandidates(dedupeCandidates(finalCandidates), rawId);

        console.timeEnd("Total Pipeline Time");
        console.groupEnd();

        // Return Result
        return {
            collectorIdNormalized: rawId || undefined,
            collectorIdRaw: ocrResult.raw,
            collectorIdConfidence: ocrResult.confidence,
            candidates: finalCandidates,
            feedback: finalCandidates.length > 0 
                ? `Found ${finalCandidates.length} matches` 
                : (rawId ? `No card found for ID ${rawId}` : "Could not read card number.")
        };
    },

    /**
     * ROI-Based Tie-Break
     * Extracts ID strips from User Image and Candidate Images.
     * Computes dHash and compares.
     */
    async performVisualTieBreak(userImageUrl: string, candidates: CardCandidate[]): Promise<CardCandidate[]> {
        try {
            // 1. Extract & Hash User Strips
            const userStrips = await extractIDStrips(userImageUrl);
            if (!userStrips.bl || !userStrips.br) return candidates; 

            const userHashBL = computeDHash(userStrips.bl);
            const userHashBR = computeDHash(userStrips.br);
            
            // 2. Compare against candidates
            const scoredCandidates = await Promise.all(candidates.map(async (c) => {
                if (!c.imageUrl) return { ...c, distance: 1000, visualSimilarity: 0 };

                try {
                    const cStrips = await extractIDStrips(c.imageUrl); 
                    if (!cStrips.bl || !cStrips.br) return { ...c, distance: 1000, visualSimilarity: 0 };

                    const cHashBL = computeDHash(cStrips.bl);
                    const cHashBR = computeDHash(cStrips.br);

                    const distBL = calculateHammingDistance(userHashBL, cHashBL);
                    const distBR = calculateHammingDistance(userHashBR, cHashBR);
                    
                    const weightedDist = (distBL * 0.6) + (distBR * 0.4);
                    // Normalize to 0-1 score (assuming max hash dist ~64)
                    const similarity = Math.max(0, 1 - (weightedDist / 40));

                    return { 
                        ...c, 
                        distance: weightedDist, 
                        visualSimilarity: similarity,
                        matchSource: 'id_strip_signature' as const,
                        _debug: { distBL, distBR }
                    };
                } catch (e) {
                    return { ...c, distance: 1000, visualSimilarity: 0 };
                }
            }));

            // 3. Sort by Similarity (Descending)
            scoredCandidates.sort((a, b) => (b.visualSimilarity || 0) - (a.visualSimilarity || 0));

            return scoredCandidates;

        } catch (e) {
            console.error("ROI Tie-break failed", e);
            return candidates;
        }
    },

    /**
     * Determines if a card is the 'Chase' card of its set.
     */
    async analyzeChaseStatus(card: CardCandidate): Promise<{ isChase: boolean, price: number }> {
        if (!card.id || !card.setId) return { isChase: false, price: 0 };

        try {
            let price = card.priceEstimate || 0;
            
            if (!price) {
                const priceData = await getCardPrice(card.id, card.variant);
                price = priceData?.market || 0;
            }

            const setChase = await fetchSetChaseCard(card.setId);
            const isIdMatch = setChase && setChase.id === card.id;

            return { 
                isChase: !!isIdMatch, 
                price 
            };

        } catch (e) {
            return { isChase: false, price: 0 };
        }
    }
};

// --- Mappers ---

const deriveTags = (apiCard: any): { cardTypeTag?: CardTypeTag, categoryTag?: CategoryTag, variantTags: VariantTag[] } => {
    const subtypes = apiCard.subtypes || [];
    const rarity = (apiCard.rarity || '').toLowerCase();
    const name = apiCard.name.toLowerCase();
    
    let cardTypeTag: CardTypeTag | undefined;
    let categoryTag: CategoryTag | undefined;
    const variantTags: VariantTag[] = [];

    // Card Type
    if (subtypes.includes('VMAX')) cardTypeTag = CardTypeTag.VMAX;
    else if (subtypes.includes('VSTAR')) cardTypeTag = CardTypeTag.VSTAR;
    else if (subtypes.includes('V')) cardTypeTag = CardTypeTag.V;
    else if (subtypes.includes('EX') || name.includes(' ex')) cardTypeTag = CardTypeTag.EX;
    else if (subtypes.includes('GX')) cardTypeTag = CardTypeTag.GX;
    else if (subtypes.includes('Radiant')) cardTypeTag = CardTypeTag.RADIANT;
    else if (subtypes.includes('Stage 2')) cardTypeTag = CardTypeTag.STAGE2;
    else if (subtypes.includes('Stage 1')) cardTypeTag = CardTypeTag.STAGE1;
    else if (subtypes.includes('Basic')) cardTypeTag = CardTypeTag.BASIC;
    else if (subtypes.includes('LEGEND')) cardTypeTag = CardTypeTag.LEGEND;
    else if (subtypes.includes('BREAK')) cardTypeTag = CardTypeTag.BREAK;
    else if (subtypes.includes('Prism Star')) cardTypeTag = CardTypeTag.PRISM;

    // Category / Rarity Tag - Expanded mapping for modern sets
    if (rarity.includes('special illustration rare') || rarity === 'sir') categoryTag = CategoryTag.SIR;
    else if (rarity.includes('illustration rare') || rarity === 'ir') categoryTag = CategoryTag.IR;
    else if (rarity.includes('hyper rare') || rarity === 'hr') categoryTag = CategoryTag.HR;
    else if (rarity.includes('ultra rare') || rarity === 'ur') categoryTag = CategoryTag.UR;
    else if (rarity.includes('secret rare') || rarity === 'sr') categoryTag = CategoryTag.SR;
    else if (rarity.includes('double rare') || rarity === 'rr') categoryTag = CategoryTag.RR;
    else if (rarity.includes('triple rare') || rarity === 'rrr') categoryTag = CategoryTag.RRR;
    else if (rarity.includes('character rare') || rarity === 'chr') categoryTag = CategoryTag.CHR;
    else if (rarity.includes('character super rare') || rarity === 'csr') categoryTag = CategoryTag.CSR;
    else if (rarity.includes('ace spec') || rarity === 'ace') categoryTag = CategoryTag.ACE;
    else if (rarity.includes('shiny rare') || rarity === 'shiny') categoryTag = CategoryTag.SHINY;
    else if (rarity.includes('shiny ultra rare')) categoryTag = CategoryTag.SHINY_ULTRA;
    else if (rarity.includes('radiant')) categoryTag = CategoryTag.RADIANT;
    
    else if (rarity.includes('trainer gallery')) variantTags.push(VariantTag.TRAINER_GALLERY);

    // Variants
    if (rarity.includes('full art') || subtypes.includes('Full Art')) variantTags.push(VariantTag.FULL_ART);
    if (name.includes('alt art') || name.includes('alternate art')) variantTags.push(VariantTag.ALT_ART);
    if (rarity.includes('promo')) variantTags.push(VariantTag.PROMO);
    if (subtypes.includes('First Edition') || name.includes('1st edition')) variantTags.push(VariantTag.FIRST_EDITION);
    
    return { cardTypeTag, categoryTag, variantTags };
};

const mapApiToCandidate = (apiCard: any): CardCandidate => {
    const { cardTypeTag, categoryTag, variantTags } = deriveTags(apiCard);

    return {
        id: apiCard.id,
        cardName: apiCard.name,
        pokemonName: apiCard.supertype === 'Pokémon' ? apiCard.name : (apiCard.subtypes?.[0] || apiCard.name),
        setId: apiCard.set?.id,
        setName: apiCard.set?.name || 'Unknown Set',
        number: apiCard.number,
        releaseYear: apiCard.set?.releaseDate?.split('/')[0] || '',
        language: 'English',
        condition: 'Near Mint', 
        confidence: 0.9, 
        imageUrl: apiCard.images?.small,
        rarity: apiCard.rarity || 'Common', 
        matchSource: 'id_lookup',
        pokemonType: apiCard.types?.[0] || 'Colorless',
        cardCategory: apiCard.supertype === 'Trainer' ? CardCategory.TRAINER : (apiCard.supertype === 'Energy' ? CardCategory.ENERGY : CardCategory.POKEMON),
        
        // New Fields
        cardTypeTag,
        categoryTag,
        variantTags
    };
};

const expandVariants = (apiCard: any): CardCandidate[] => {
    const base = mapApiToCandidate(apiCard);
    const variants: CardCandidate[] = [];
    const prices = apiCard.tcgplayer?.prices;

    if (!prices) {
        return [{ ...base, variant: base.rarity === 'Common' ? 'Normal' : base.rarity }];
    }

    // Map API price buckets to user-friendly variant names
    if (prices.normal) {
        variants.push({ ...base, variant: 'Normal', priceEstimate: prices.normal.market });
    }
    
    if (prices.holofoil) {
        // Special rarities often use 'holofoil' bucket but deserve better names
        const variantName = base.categoryTag ? base.categoryTag : (base.rarity || 'Holofoil');
        variants.push({ ...base, variant: variantName, priceEstimate: prices.holofoil.market });
    }
    
    if (prices.reverseHolofoil) {
        variants.push({ ...base, variant: 'Reverse Holofoil', priceEstimate: prices.reverseHolofoil.market });
    }
    
    if (prices['1stEditionHolofoil']) {
        variants.push({ ...base, variant: '1st Edition Holo', priceEstimate: prices['1stEditionHolofoil'].market });
    }
    
    if (prices['1stEdition']) {
        variants.push({ ...base, variant: '1st Edition', priceEstimate: prices['1stEdition'].market });
    }
    
    if (prices.unlimitedHolofoil) {
        variants.push({ ...base, variant: 'Unlimited Holo', priceEstimate: prices.unlimitedHolofoil.market });
    }
    
    if (prices.unlimited) {
        variants.push({ ...base, variant: 'Unlimited', priceEstimate: prices.unlimited.market });
    }

    if (variants.length === 0) {
        variants.push({ ...base, variant: base.rarity, priceEstimate: undefined });
    }

    return variants;
};
