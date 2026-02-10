
import { IdentificationResult, CardCandidate, PokemonType, CardCategory, VariantTag } from '../types';
import { cropImageCorners, binarizeBase64, extractIDStrips, computeDHash, calculateHammingDistance } from '../utils/imageProcessing';
import { performOcrOnCorners } from './geminiService';
import { searchCardByCollectorNumber, getCardPrice, fetchSetChaseCard } from './tcgApiService';

export const CardRecognitionService = {

    /**
     * MAIN PIPELINE
     * 1. Pre-process: Crop corners & Binarize for OCR.
     * 2. OCR: Extract ID (e.g. "001/165", "TG13/TG30", "SWSH123").
     * 3. API Lookup: Fetch candidates by ID logic.
     * 4. Map & Expand Variants: Explode API results into specific variants (Normal, Reverse Holo).
     * 5. Tie-Break: ROI Strip dHash comparison (BL/BR) if variants ambiguous visually.
     */
    async identify(base64Image: string, mimeType: string = 'image/jpeg'): Promise<IdentificationResult> {
        console.group("CardRecognition Pipeline");
        console.time("Total Pipeline Time");
        
        // 1. Image Pre-processing for OCR
        console.log("Stage 1: Pre-processing Image...");
        const { leftCorner, rightCorner } = await cropImageCorners(base64Image);
        const [binaryLeft, binaryRight] = await Promise.all([
            binarizeBase64(leftCorner),
            binarizeBase64(rightCorner)
        ]);

        // 2. OCR Stage
        console.log("Stage 2: Calling OCR...");
        const ocrResult = await performOcrOnCorners(binaryLeft, binaryRight);
        console.log("OCR Result:", ocrResult);

        let candidates: any[] = [];
        // Clean up OCR spacing issues (e.g. "0 5 8 / 1 0 2" -> "058/102")
        const rawId = (ocrResult.normalized || '').replace(/\s+/g, '');

        // 3. API Lookup Stage (Parsing Logic)
        if (rawId && ocrResult.confidence > 0.6) {
            console.log("Stage 3: Parsing ID", rawId);
            
            // Pattern 1: Standard Fraction (e.g. 058/102)
            const fractionMatch = rawId.match(/^([A-Z]{0,2})?(\d+)\/([A-Z]{0,2})?(\d+)$/i);
            
            // Pattern 2: Trainer Gallery / Shiny Vault / Galarian Gallery (e.g. TG13/TG30, SV50/SV94, GG01/GG70)
            const subsetMatch = rawId.match(/^((TG|SV|GG)\d+)\/((TG|SV|GG)\d+)$/i);

            // Pattern 3: Promo / Simple ID (e.g. SWSH123, 123)
            const promoMatch = rawId.match(/^([A-Z]{2,5})-?(\d+)$/i);

            if (subsetMatch) {
                console.log("Matched Subset Pattern:", subsetMatch[1]);
                candidates = await searchCardByCollectorNumber(subsetMatch[1]);
            } else if (fractionMatch) {
                console.log("Matched Fraction Pattern:", { num: fractionMatch[2], total: fractionMatch[4] });
                candidates = await searchCardByCollectorNumber(fractionMatch[2], fractionMatch[4]);
            } else if (promoMatch) {
                console.log("Matched Promo Pattern:", { prefix: promoMatch[1], num: promoMatch[2] });
                candidates = await searchCardByCollectorNumber(rawId, undefined, promoMatch[1]);
            } else {
                console.log("Fallback: Raw String Search");
                candidates = await searchCardByCollectorNumber(rawId);
            }
        } else {
            console.warn("OCR Confidence too low or ID empty.");
        }

        console.log(`Stage 3 Complete: Found ${candidates.length} API Candidates (pre-expansion)`);

        // 4. Map & Expand Variants
        let finalCandidates: CardCandidate[] = [];
        candidates.forEach(apiCard => {
            const variants = expandVariants(apiCard);
            finalCandidates.push(...variants);
        });

        // 5. Tie-Break Stage (ROI Strip Signature)
        if (finalCandidates.length > 1) {
            console.log("Stage 4: Ambiguous matches detected. Running Visual Tie-Break...");
            finalCandidates = await this.performVisualTieBreak(`data:${mimeType};base64,${base64Image}`, finalCandidates);
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
            console.log("User Hashes:", { BL: userHashBL, BR: userHashBR });

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
                        _debug: { distBL, distBR, cHashBL }
                    };
                } catch (e) {
                    console.warn("Tie-break hash failed for candidate", c.id);
                    return { ...c, distance: 1000, visualSimilarity: 0 };
                }
            }));

            // 3. Sort by Distance (Ascending) / Similarity (Descending)
            scoredCandidates.sort((a, b) => (b.visualSimilarity || 0) - (a.visualSimilarity || 0));

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
            // If not available, fetch from API with variant
            let price = card.priceEstimate || 0;
            
            if (!price) {
                const priceData = await getCardPrice(card.id, card.variant);
                price = priceData?.market || 0;
            }

            const setChase = await fetchSetChaseCard(card.setId);
            
            // Criteria: 
            // 1. Must be the identified chase card ID of the set.
            // 2. Must have a value > $20 (Arbitrary 'Chase' threshold for MVP excitement).
            // 3. Or check if current price > setChase price * 0.9 (approx match)
            
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

const mapApiToCandidate = (apiCard: any): CardCandidate => {
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
        rarity: apiCard.rarity || 'Common', // Enforce rarity fallback
        matchSource: 'id_lookup',
        pokemonType: apiCard.types?.[0] || 'Colorless',
        cardCategory: apiCard.supertype === 'Trainer' ? 'Trainer' : 'Pokemon'
    };
};

const expandVariants = (apiCard: any): CardCandidate[] => {
    const base = mapApiToCandidate(apiCard);
    const variants: CardCandidate[] = [];
    const prices = apiCard.tcgplayer?.prices;

    if (!prices) {
        // No specific price info, return base with generic variant
        return [{ ...base, variant: base.rarity === 'Common' ? 'Normal' : base.rarity }];
    }

    // Explicitly check for price buckets available in TCGPlayer API
    if (prices.normal) {
        variants.push({ ...base, variant: 'Normal', priceEstimate: prices.normal.market });
    }
    if (prices.holofoil) {
        variants.push({ ...base, variant: 'Holofoil', priceEstimate: prices.holofoil.market });
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

    // Fallback: If prices exist but didn't match standard keys (rare), add base
    if (variants.length === 0) {
        variants.push({ ...base, variant: base.rarity, priceEstimate: undefined });
    }

    return variants;
};
