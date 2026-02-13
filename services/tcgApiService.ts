
// Service to interact with api.pokemontcg.io

import { getEnv } from '../utils/env';

const API_BASE_URL = 'https://api.pokemontcg.io/v2';
const API_KEY = '2ee47417-4429-4108-b170-60f468fd4d49'; // Public key

const HEADERS = {
  'X-Api-Key': getEnv('API_KEY') || API_KEY
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

  try {
    const response = await fetch(`${API_BASE_URL}/sets?orderBy=-releaseDate`, { headers: HEADERS });
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

    try {
        const response = await fetch(`${API_BASE_URL}/cards/${id}`, { headers: HEADERS });
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

    try {
        // Query to get the highest market price across common high-value types
        // API Sort priority: Holofoil > 1st Ed > Normal
        const response = await fetch(
            `${API_BASE_URL}/cards?q=set.id:${setId}&orderBy=-tcgplayer.prices.holofoil.market,-tcgplayer.prices.1stEditionHolofoil.market,-tcgplayer.prices.normal.market&pageSize=1`, 
            { headers: HEADERS }
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
    try {
        const response = await fetch(
            `${API_BASE_URL}/cards?q=set.id:${setId}&orderBy=-tcgplayer.prices.holofoil.market,-tcgplayer.prices.normal.market&pageSize=${limit}`, 
            { headers: HEADERS }
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
        'vp': 'svp', // Common shorthand for Violet/Scarlet Promos
        'sv': 'sv' // Shiny Vault
    };
    
    // Direct match
    if (mappings[p]) return mappings[p];
    
    // Partial match for known prefixes
    if (p.startsWith('swsh')) return 'swshp';
    if (p.startsWith('xy')) return 'xyp';
    if (p.startsWith('sm')) return 'smp';
    
    // Try to find if it matches known set codes directly (e.g. 'evs', 'base1')
    return p.length >= 3 ? p : null;
};

/**
 * Enhanced search to handle TG, SV, and Promo formats correctly.
 * Supports flexible partial matching for "Number/Total" and subsets.
 */
export const searchCardByCollectorNumber = async (number: string, total?: string, setPrefix?: string): Promise<any[]> => {
    try {
        let queries: string[] = [];
        // Remove leading zeros for flexible matching (API sometimes uses 1 instead of 001)
        const cleanNum = number.replace(/^0+/, ''); 
        // Keep zeros for formats that require it (e.g. SWSH001)
        const rawNum = number; 

        // Strategy A: Promo / Prefix Logic (High Priority)
        if (setPrefix) {
            const promoSetId = await resolvePromoSet(setPrefix);
            
            if (promoSetId) {
                // If we resolved a specific promo set (e.g. 'swshp'), target it directly
                queries.push(`number:"${rawNum}" set.id:${promoSetId}`);
                // Try clean num too
                if (cleanNum !== rawNum) queries.push(`number:"${cleanNum}" set.id:${promoSetId}`);
            } else {
                // Generic prefix search (e.g. subset 'TG' inside a set)
                // Try number:"TG01"
                queries.push(`number:"${setPrefix}${cleanNum}"`);
                // Try number:"TG01" with wildcard on set ID
                queries.push(`number:"${cleanNum}" (id:${setPrefix.toLowerCase()}* OR set.id:${setPrefix.toLowerCase()}*)`);
            }
        } 
        
        // Strategy B: Standard Set Fraction Logic (058/102)
        if (total) {
            // Strict: Number + Total
            queries.push(`number:"${rawNum}" set.printedTotal:${total}`);
            // If total didn't match, maybe it's secret rare (number > printedTotal)
            // Just search number
            queries.push(`number:"${rawNum}"`);
        }

        // Strategy C: Raw Search (Catch-all)
        // If query is "TG13", search number:"TG13"
        queries.push(`number:"${rawNum}"`);
        // If "058", search "58"
        if (cleanNum !== rawNum) queries.push(`number:"${cleanNum}"`);

        // Helper to run query
        const runQuery = async (query: string) => {
            //console.log(`[TCGAPI] Searching: ${query}`);
            const response = await fetch(`${API_BASE_URL}/cards?q=${encodeURIComponent(query)}`, { headers: HEADERS });
            if (!response.ok) return [];
            return (await response.json()).data || [];
        };

        // Run queries in sequence until results found
        let candidates: any[] = [];
        const seenIds = new Set();

        for (const q of queries) {
            const results = await runQuery(q);
            if (results.length > 0) {
                // Filter duplicates if multiple queries return same cards
                for (const c of results) {
                    if (!seenIds.has(c.id)) {
                        candidates.push(c);
                        seenIds.add(c.id);
                    }
                }
                // If we found exact matches, we can stop.
                if (candidates.length > 0) break;
            }
        }
        
        // Post-Processing: Filtering & Sorting
        if (candidates.length > 0) {
            // 1. Prioritize exact number match
            // API fuzzy match might return number:"11" when searching "1"
            const exactMatches = candidates.filter((c: any) => 
                c.number.toLowerCase() === rawNum.toLowerCase() || 
                c.number.toLowerCase() === cleanNum.toLowerCase() ||
                c.number.toLowerCase() === `${setPrefix || ''}${cleanNum}`.toLowerCase()
            );
            
            if (exactMatches.length > 0) {
                // 2. If we have exact matches and a total was provided, prioritize matching total
                if (total) {
                    const totalMatches = exactMatches.filter((c: any) => c.set.printedTotal.toString() === total);
                    if (totalMatches.length > 0) return totalMatches;
                }
                return exactMatches; 
            }
        }
        
        return candidates;
    } catch (e) {
        console.error("Search error", e);
        return [];
    }
};
