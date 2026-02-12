
// Service to interact with api.pokemontcg.io

import { getEnv } from '../utils/env';

const API_BASE_URL = 'https://api.pokemontcg.io/v2';
const API_KEY_ENV_NAME = 'API_KEY';
const MISSING_API_KEY_MESSAGE =
  'Pokemon TCG API key is not configured. Please set VITE_API_KEY (or API_KEY) in your environment to enable card data and pricing features.';

const getHeaders = (): Record<string, string> | null => {
  const apiKey = getEnv(API_KEY_ENV_NAME)?.trim();

  if (!apiKey) {
    console.error(MISSING_API_KEY_MESSAGE);
    return null;
  }

  return { 'X-Api-Key': apiKey };
};

// Simple In-Memory Cache
const CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60; // 1 Hour

const VARIANT_MAP: Record<string, string> = {
    'Normal': 'normal',
    'Holofoil': 'holofoil',
    'Reverse Holofoil': 'reverseHolofoil',
    '1st Edition Holo': '1stEditionHolofoil',
    '1st Edition': '1stEdition',
    'Unlimited Holo': 'unlimitedHolofoil',
    'Unlimited': 'unlimited'
};

export const fetchTcgSets = async () => {
  const cacheKey = 'sets';
  if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) return CACHE[cacheKey].data;

  const headers = getHeaders();
  if (!headers) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/sets?orderBy=-releaseDate`, { headers });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    const sets = data.data || [];
    CACHE[cacheKey] = { data: sets, timestamp: Date.now() };
    return sets;
  } catch (error) {
    console.warn("TCG API Failed (Sets)", error);
    return [];
  }
};

export const fetchCardById = async (id: string) => {
    const cacheKey = `card_${id}`;
    if (CACHE[cacheKey]) return CACHE[cacheKey].data;

    const headers = getHeaders();
    if (!headers) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/cards/${id}`, { headers });
        if (!response.ok) return null;
        const json = await response.json();
        CACHE[cacheKey] = { data: json.data, timestamp: Date.now() };
        return json.data;
    } catch (e) {
        return null;
    }
};

/**
 * Fetches the SINGLE most expensive card in the set to determine "THE CHASE".
 * Logic: Query cards in set, sort by holofoil market price descending.
 */
export const fetchSetChaseCard = async (setId: string) => {
    const cacheKey = `chase_${setId}`;
    if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) return CACHE[cacheKey].data;

    const headers = getHeaders();
    if (!headers) return null;

    try {
        // Query to get the highest market price across common high-value types
        // Note: The API sort logic is specific. We try to find the absolute max.
        const response = await fetch(
            `${API_BASE_URL}/cards?q=set.id:${setId}&orderBy=-tcgplayer.prices.holofoil.market,-tcgplayer.prices.1stEditionHolofoil.market,-tcgplayer.prices.normal.market&pageSize=1`, 
            { headers }
        );
        
        if (!response.ok) return null;
        const json = await response.json();
        const card = json.data?.[0] || null;
        
        if (card) {
            CACHE[cacheKey] = { data: card, timestamp: Date.now() };
        }
        return card;
    } catch (e) {
        console.warn("Chase fetch failed", e);
        return null;
    }
};

export const fetchSetHighValueCards = async (setId: string, limit: number = 5) => {
    const headers = getHeaders();
    if (!headers) return [];

    try {
        const response = await fetch(
            `${API_BASE_URL}/cards?q=set.id:${setId}&orderBy=-tcgplayer.prices.holofoil.market,-tcgplayer.prices.normal.market&pageSize=${limit}`, 
            { headers }
        );
        return (await response.json()).data || [];
    } catch { return []; }
};

export const getCardPrice = async (cardId: string, variant?: string): Promise<{ market: number, low: number, high: number, currency: string } | null> => {
    try {
        const card = await fetchCardById(cardId);
        if (!card || !card.tcgplayer) return null;

        const prices = card.tcgplayer.prices;
        if (!prices) return null;

        let priceData = null;

        // 1. Try specific variant if provided
        if (variant) {
            const apiKey = VARIANT_MAP[variant];
            if (apiKey && prices[apiKey]) {
                priceData = prices[apiKey];
            } else if (variant !== 'Normal' && prices.holofoil) {
                // Fallback: Many "Special" rarities (SIR, IR) just use 'holofoil' pricing bucket
                priceData = prices.holofoil;
            } else if (variant === 'Normal' && prices.normal) {
                priceData = prices.normal;
            }
        }

        // 2. Fallback Priority (if no variant or specific variant data missing)
        if (!priceData) {
             priceData = 
                prices.holofoil || 
                prices['1stEditionHolofoil'] || 
                prices.reverseHolofoil || 
                prices.normal || 
                prices['1stEdition'] || 
                prices.unlimited;
        }

        if (priceData) {
            return {
                market: priceData.market || priceData.mid || 0,
                low: priceData.low || 0,
                high: priceData.high || 0,
                currency: 'USD'
            };
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const resolvePromoSet = async (prefix: string): Promise<string | null> => {
    const p = prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
    const mappings: Record<string, string> = {
        'svp': 'svp', // Scarlet & Violet Promo
        'swsh': 'swshp', // Sword & Shield Promo
        'sm': 'smp', // Sun & Moon Promo
        'xy': 'xyp', // XY Promo
        'bw': 'bwp', // Black & White Promo
        'hgss': 'hsp', // HGSS Promo
        'pop': 'pop', // POP Series
        // Common misreads or alternative codes
        'tg': 'tg', // Trainer Gallery (usually subsets, handled by ID logic)
        'gg': 'gg', // Galarian Gallery
        'sv': 'sv'  // Shiny Vault
    };
    
    // Direct match or partial match
    if (mappings[p]) return mappings[p];
    
    // Try to find if it matches known set codes directly (e.g. 'evs', 'base1')
    return p.length >= 3 ? p : null;
};

/**
 * Enhanced search to handle TG, SV, and Promo formats correctly.
 * Now includes fallback logic if 'total' mismatch causes empty results.
 */
export const searchCardByCollectorNumber = async (number: string, total?: string, setPrefix?: string): Promise<any[]> => {
    const headers = getHeaders();
    if (!headers) return [];

    try {
        let q = `number:"${number}"`;
        
        // Refine query if we have a set hint (e.g. SWSH123 -> setPrefix=SWSH)
        if (setPrefix) {
            const promoSetId = await resolvePromoSet(setPrefix);
            if (promoSetId) {
                q += ` set.id:${promoSetId}`;
            } else {
                q += ` (id:${setPrefix.toLowerCase()}* OR set.id:${setPrefix.toLowerCase()}*)`;
            }
        } else if (total) {
            // For standard sets, add printedTotal to query
            const isStandardFormat = /^\d+$/.test(number); 
            if (isStandardFormat) {
                 q += ` set.printedTotal:${total}`;
            }
        }

        const runQuery = async (query: string) => {
            const response = await fetch(`${API_BASE_URL}/cards?q=${encodeURIComponent(query)}`, { headers });
            if (!response.ok) return [];
            return (await response.json()).data || [];
        };

        let candidates = await runQuery(q);

        // Fallback: If strict search failed (likely due to total mismatch or set prefix issues), try number only
        if (candidates.length === 0 && (total || setPrefix)) {
            console.log("Strict search failed, trying fallback by number only:", number);
            candidates = await runQuery(`number:"${number}"`);
        }
        
        // Post-Processing: Filtering & Sorting
        if (candidates.length > 0) {
            // 1. Exact Number Match Preference (case insensitive)
            const exactMatches = candidates.filter((c: any) => c.number.toLowerCase() === number.toLowerCase());
            
            // 2. If we have exact matches and a total was provided, prioritize the one matching total
            if (exactMatches.length > 0 && total) {
                const totalMatches = exactMatches.filter((c: any) => c.set.printedTotal.toString() === total);
                if (totalMatches.length > 0) return totalMatches;
                return exactMatches; // Return exact number matches even if total mismatches
            }
            
            if (exactMatches.length > 0) return exactMatches;
        }
        
        return candidates;
    } catch (e) {
        console.error("Search error", e);
        return [];
    }
};
