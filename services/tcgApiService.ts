
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
 */
export const fetchSetChaseCard = async (setId: string) => {
    const cacheKey = `chase_${setId}`;
    if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) return CACHE[cacheKey].data;

    try {
        // Sort by market price descending, take 1.
        const response = await fetch(
            `${API_BASE_URL}/cards?q=set.id:${setId}&orderBy=-tcgplayer.prices.holofoil.market,-tcgplayer.prices.normal.market&pageSize=1`, 
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
    // Legacy support, redirects to generic query
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
            }
        }

        // 2. Fallback Priority: Holofoil > Normal > Reverse Holofoil > 1st Edition
        if (!priceData) {
             priceData = prices.holofoil || prices.normal || prices.reverseHolofoil || prices['1stEditionHolofoil'] || prices['1stEdition'] || prices.unlimited;
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
        'svp': 'svp', 'sv': 'sv1', 'pal': 'sv2', 'obf': 'sv3', '151': 'sv3a',
        'swsh': 'swshp', 'crz': 'swsh12pt5', 'sit': 'swsh12', 'lor': 'swsh11',
        'asr': 'swsh10', 'brs': 'swsh9', 'fst': 'swsh8', 'cel': 'cel25',
        'evs': 'swsh7', 'cre': 'swsh6', 'bst': 'swsh5', 'sf': 'swsh45',
        'vv': 'swsh4', 'cpa': 'swsh35', 'daa': 'swsh3', 'rcl': 'swsh2', 'ssh': 'swsh1',
        'sm': 'smp', 'hif': 'sm115', 'xy': 'xyp', 'evo': 'xy12', 'base': 'base1'
    };
    if (mappings[p]) return mappings[p];
    if (p.startsWith('pop')) return p; 
    return null;
};

/**
 * Enhanced search to handle TG, SV, and Promo formats correctly.
 */
export const searchCardByCollectorNumber = async (number: string, total?: string, setPrefix?: string): Promise<any[]> => {
    try {
        // TCG API often stores TG cards as number:"TG01" not "TG01/TG30"
        // It stores Shiny Vault as number:"SV01"
        // It stores Promos as number:"SWSH001"
        
        let q = `number:"${number}"`;
        
        // Refine query if we have a set hint
        if (setPrefix) {
            const promoSetId = await resolvePromoSet(setPrefix);
            if (promoSetId) q += ` set.id:${promoSetId}`;
            // If prefix looks like a standard set code (e.g. SWSH123 -> swsh), try to filter
            else if (setPrefix.length >= 2) q += ` (set.id:${setPrefix.toLowerCase()}* OR id:${setPrefix.toLowerCase()}*)`;
        } else if (total) {
            // Only use printedTotal for standard numbered cards (e.g. 058/102)
            // Do NOT use it for TG/SV subsets as their denominators don't match the main set total in API
            if (!number.startsWith('TG') && !number.startsWith('SV') && !number.startsWith('GG')) {
                 q += ` set.printedTotal:${total}`;
            }
        }

        const response = await fetch(`${API_BASE_URL}/cards?q=${encodeURIComponent(q)}`, { headers: HEADERS });
        if (!response.ok) return [];
        const json = await response.json();
        let candidates = json.data || [];
        
        // Exact Match Filtering
        if (candidates.length > 0) {
            // Prioritize exact number matches (case insensitive)
            const exactMatches = candidates.filter((c: any) => c.number.toLowerCase() === number.toLowerCase());
            if (exactMatches.length > 0) return exactMatches;
        }
        return candidates;
    } catch (e) {
        return [];
    }
};
