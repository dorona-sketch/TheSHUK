
// Robust storage utility to handle Date serialization/deserialization

export const saveToStorage = (key: string, value: any) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(value));
        }
    } catch (e) {
        console.error(`Failed to save ${key} to storage`, e);
    }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        if (typeof window === 'undefined') return defaultValue;
        
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
