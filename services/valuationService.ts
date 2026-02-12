
import { getCardPrice, fetchSetChaseCard } from './tcgApiService';

export interface PriceProvider {
    getCardMarketPrice(cardId: string, variant?: string): Promise<{ currency: string; marketPrice: number; source: string; low?: number; high?: number }>;
    getSetChaseCard(setId: string): Promise<{ chaseCardId: string; chasePrice: number }>;
}

export const valuationService: PriceProvider = {
    async getCardMarketPrice(cardId: string, variant?: string) {
        // Use Real API via tcgApiService
        const realPrice = await getCardPrice(cardId, variant);
        if (realPrice) {
            return {
                currency: realPrice.currency,
                marketPrice: realPrice.market,
                low: realPrice.low,
                high: realPrice.high,
                source: 'TCGPlayer'
            };
        }

        return { 
            currency: 'USD', 
            marketPrice: 0, 
            low: 0,
            high: 0,
            source: 'Unknown' 
        };
    },

    async getSetChaseCard(setId: string) {
        const card = await fetchSetChaseCard(setId);
        if (card) {
            const price = card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market || 0;
            return { chaseCardId: card.id, chasePrice: price };
        }
        return { chaseCardId: '', chasePrice: 0 };
    }
};

export const estimateOpenedProductValue = (type: string, setId: string, quantity: number): number => {
    // Mock baseline values for products (since public API doesn't provide sealed product prices easily) - Need Fix
    let base = 0;
    
    // Heuristics based on product type
    switch(type) {
        case 'ETB': base = 45; break;
        case 'Booster Box': base = 120; break;
        case 'Single Packs': base = 4.5; break;
        case 'Booster Bundle': base = 25; break;
        case 'Collection Box': base = 30; break;
        case 'UPC': base = 100; break;
        case 'Tin': base = 20; break;
        case 'Other': base = 20; break;
        default: base = 10;
    }

    // Heuristics for older sets (Vintage/Mid-era multiplier)
    const vintagePrefixes = ['base', 'gym', 'neo', 'ex', 'dp', 'bw', 'xy'];
    if (vintagePrefixes.some(p => setId.startsWith(p))) {
        base *= 3; // Rough multiplier for vintage sealed
    }

    return base * quantity;
};
