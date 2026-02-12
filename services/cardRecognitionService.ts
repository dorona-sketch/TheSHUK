
import { IdentificationResult, CardCandidate, PokemonType, CardCategory, VariantTag, CardTypeTag, CategoryTag } from '../types';
import { cropImageCorners, binarizeBase64, extractIDStrips, computeDHash, calculateHammingDistance, autoCropCard } from '../utils/imageProcessing';
import { performOcrOnCorners } from './geminiService';
import { searchCardByCollectorNumber, getCardPrice, fetchSetChaseCard } from './tcgApiService';

export const CardRecognitionService = {

    /**
     * MAIN PIPELINE
     * 1. Pre-process: Auto-Crop card from background & Binarize corners for OCR.
     * 2. OCR: Extract ID (e.g. "001/165", "TG13/TG30", "SWSH123").
     * 3. API Lookup: Fetch candidates by ID logic.
     * 4. Map & Expand Variants: Explode API results into specific variants (Normal, Reverse Holo) with Pricing.
     * 5. Tie-Break: ROI Strip dHash comparison (BL/BR) if variants ambiguous visually.
     */
    async identify(base64Image: string, mimeType: string = 'image/jpeg'): Promise<IdentificationResult> {
        console.group("CardRecognition Pipeline");
        console.time("Total Pipeline Time");
        
        // 1. Image Pre-processing for OCR
        console.log("Stage 1: Auto-Cropping & Pre-processing...");
        const croppedBase64 = await autoCropCard(base64Image); // Use OpenCV crop if available
        const { leftCorner, rightCorner } = await cropImageCorners(croppedBase64);
        
        const [binaryLeft, binaryRight] = await Promise.all([
            binarizeBase64(leftCorner),
            binarizeBase64(rightCorner)
        ]);

        // 2. OCR Stage
        console.log("Stage 2: Calling OCR...");
        const ocrResult = await performOcrOnCorners(binaryLeft, binaryRight);
        console.log("OCR Result:", ocrResult);

        let candidates: any[] = [];
        
        // Clean up OCR spacing & Common Char replacements (O->0, I->1, etc)
        let rawId = (ocrResult.normalized || '').replace(/\s+/g, '').toUpperCase();
        
        // Heuristic character fix for numbers (often OCR reads 058 as O58)
        // We only replace O/I/l if they are mixed with numbers in a way that suggests they are digits
        rawId = rawId.replace(/O/g, '0').replace(/[Il]/g, '1');

        // 3. API Lookup Stage (Parsing Logic)
        if (rawId && ocrResult.confidence > 0.4) {
            console.log("Stage 3: Parsing ID", rawId);
            
            // Regex Strategy:
            
            // 1. Subsets with Denominator (e.g. TG13/TG30, RC5/RC32)
            // Matches [Letters][Numbers]/[Letters][Numbers]
            const subsetFullMatch = rawId.match(/^([A-Z]{1,3})(\d+)\/([A-Z]{1,3})?(\d+)$/);
            
            // 2. Subsets with Missing Denominator Prefix (e.g. TG13/30)
            const subsetMixedMatch = rawId.match(/^([A-Z]{1,3})(\d+)\/(\d+)$/);

            // 3. Standard Fraction (e.g. 058/102, 5/18)
            const fractionMatch = rawId.match(/^(\d+)\/(\d+)([A-Z]+)?$/);
            
            // 4. Promo / Simple ID (e.g. SWSH123, SVP001, TG05)
            // Matches [Letters][Numbers]
            const promoMatch = rawId.match(/^([A-Z]{2,5})[-]?(\d+)$/);

            try {
                if (subsetFullMatch) {
                    // e.g. TG13/TG30 -> Prefix=TG, Num=13
                    const prefix = subsetFullMatch[1];
                    const num = subsetFullMatch[2];
                    const fullId = `${prefix}${num}`;
                    const total = subsetFullMatch[4];
                    console.log("Matched Subset Pattern A:", fullId, "Total:", total);
                    candidates = await searchCardByCollectorNumber(fullId, undefined, prefix);
                } else if (subsetMixedMatch) {
                    // e.g. TG13/30 -> Prefix=TG, Num=13
                    const prefix = subsetMixedMatch[1];
                    const num = subsetMixedMatch[2];
                    const fullId = `${prefix}${num}`;
                    const total = subsetMixedMatch[3];
                    console.log("Matched Subset Pattern B:", fullId, "Total:", total);
                    candidates = await searchCardByCollectorNumber(fullId, total, prefix);
                } else if (fractionMatch) {
                    // e.g. 058/102 -> Num=058, Total=102
                    const number = fractionMatch[1];
                    const total = fractionMatch[2];
                    console.log("Matched Fraction Pattern:", { number, total });
                    candidates = await searchCardByCollectorNumber(number, total);
                } else if (promoMatch) {
                    // e.g. SWSH123 -> Prefix=SWSH, Num=123
                    const prefix = promoMatch[1];
                    const num = promoMatch[2];
                    console.log("Matched Promo/Simple Pattern:", { prefix, num, raw: rawId });
                    candidates = await searchCardByCollectorNumber(rawId, undefined, prefix);
                } else {
                    console.log("Fallback: Raw String Search");
                    candidates = await searchCardByCollectorNumber(rawId);
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

        // 5. Tie-Break Stage (ROI Strip Signature)
        if (finalCandidates.length > 1) {
            console.log("Stage 4: Ambiguous matches detected. Running Visual Tie-Break...");
            finalCandidates = await this.performVisualTieBreak(`data:${mimeType};base64,${croppedBase64}`, finalCandidates);
        } else {
            console.log("Stage 4: Skipped (Single or No candidate)");
        }

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
            console.groupCollapsed("Visual Tie-Break Details");
            
            // 1. Extract & Hash User Strips
            const userStrips = await extractIDStrips(userImageUrl);
            if (!userStrips.bl || !userStrips.br) {
                console.warn("Failed to extract user image strips");
                console.groupEnd();
                return candidates; 
            }

            const userHashBL = computeDHash(userStrips.bl);
            const userHashBR = computeDHash(userStrips.br);
            
            // 2. Compare against candidates
            const scoredCandidates = await Promise.all(candidates.map(async (c) => {
                // If candidate has no image, push to bottom
                if (!c.imageUrl) return { ...c, distance: 1000, visualSimilarity: 0 };

                try {
                    // Optimized: Only fetch/hash if not identical to another candidate we already checked? 
                    // For now, simpler to process all.
                    
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
                    console.warn("Tie-break hash failed for candidate", c.id);
                    return { ...c, distance: 1000, visualSimilarity: 0 };
                }
            }));

            // 3. Sort by Similarity (Descending)
            scoredCandidates.sort((a, b) => (b.visualSimilarity || 0) - (a.visualSimilarity || 0));

            // Logic Check: If multiple candidates share the exact same Image URL (e.g. variants from same API ID),
            // they will have identical scores. We keep them adjacent.
            
            console.table(scoredCandidates.map(c => ({
                name: c.cardName,
                variant: c.variant,
                similarity: (c.visualSimilarity || 0).toFixed(4),
                dist: (c.distance || 0).toFixed(2)
            })));
            console.groupEnd();

            return scoredCandidates;

        } catch (e) {
            console.error("ROI Tie-break failed", e);
            console.groupEnd();
            return candidates;
        }
    },

    /**
     * Determines if a card is the 'Chase' card of its set.
     * Logic: Matches set chase card ID AND ensures value is significant.
     */
    async analyzeChaseStatus(card: CardCandidate): Promise<{ isChase: boolean, price: number }> {
        if (!card.id || !card.setId) return { isChase: false, price: 0 };

        try {
            // Priority: Use the price estimate for the specific variant (e.g. Holo vs Normal)
            let price = card.priceEstimate || 0;
            
            // If estimate missing (e.g. newly added variant logic), fetch fresh
            if (!price) {
                const priceData = await getCardPrice(card.id, card.variant);
                price = priceData?.market || 0;
            }

            const setChase = await fetchSetChaseCard(card.setId);
            
            // Criteria: 
            // 1. ID Match: Is this card ID the same as the most expensive card in the set?
            // 2. Value Threshold: Is it actually valuable? (> $20)
            
            const isIdMatch = setChase && setChase.id === card.id;
            const isHighValue = price > 20;

            return { 
                isChase: !!(isIdMatch && isHighValue), 
                price 
            };

        } catch (e) {
            console.error("Chase analysis failed", e);
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

    // Category / Rarity Tag
    if (rarity.includes('special illustration rare') || rarity === 'sir') categoryTag = CategoryTag.SIR;
    else if (rarity.includes('illustration rare') || rarity === 'ir') categoryTag = CategoryTag.IR;
    else if (rarity.includes('hyper rare') || rarity === 'hr') categoryTag = CategoryTag.HR;
    else if (rarity.includes('ultra rare') || rarity === 'ur') categoryTag = CategoryTag.UR;
    else if (rarity.includes('secret rare') || rarity === 'sr') categoryTag = CategoryTag.SR;
    else if (rarity.includes('double rare') || rarity === 'rr') categoryTag = CategoryTag.RR;
    else if (rarity.includes('character rare')) categoryTag = CategoryTag.CHR;
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
        // Fallback if price object exists but specific keys don't match known ones
        variants.push({ ...base, variant: base.rarity, priceEstimate: undefined });
    }

    return variants;
};
