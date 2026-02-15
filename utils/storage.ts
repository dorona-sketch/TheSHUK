
// Robust storage utility to handle Date serialization/deserialization

const CURRENT_SCHEMA_VERSION = 3; // Increment this when breaking changes occur
const SCHEMA_KEY = 'pokevault_schema_version';

export const saveToStorage = (key: string, value: any) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(value));
            localStorage.setItem(SCHEMA_KEY, CURRENT_SCHEMA_VERSION.toString());
        }
    } catch (e) {
        console.error(`Failed to save ${key} to storage`, e);
    }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        if (typeof window === 'undefined') return defaultValue;
        
        // Version Check / Migration Logic
        const storedVersion = localStorage.getItem(SCHEMA_KEY);
        if (storedVersion && parseInt(storedVersion) < CURRENT_SCHEMA_VERSION) {
            console.warn("Detected old schema version. Migrating or Resetting...");
            // For MVP, a simple strategy is to wipe complex data if version mismatches to prevent crashes
            // In production, we would write specific migration functions here.
            if (key === 'pokevault_listings' || key === 'pokevault_break_entries') {
                return defaultValue; 
            }
        }

        const item = localStorage.getItem(key);
        if (!item) return defaultValue;

        return JSON.parse(item, (key, value) => {
            // ISO 8601 Date regex (handles optional milliseconds and optional Z or offset)
            // Matches: 2023-10-05T14:30:00Z, 2023-10-05T14:30:00.000Z, 2023-10-05T14:30:00+00:00
            const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;
            
            if (typeof value === 'string' && dateRegex.test(value)) {
                const d = new Date(value);
                // Ensure it's a valid date
                if (!isNaN(d.getTime())) {
                    return d;
                }
            }
            return value;
        }) as T;
    } catch (e) {
        console.error(`Failed to load ${key} from storage`, e);
        return defaultValue;
    }
};
