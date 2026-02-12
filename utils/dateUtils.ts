
// Utility for Date parsing and formatting

export const parseDate = (date: any): Date | null => {
    if (date === null || date === undefined) return null;
    
    try {
        if (date instanceof Date) {
            return isNaN(date.getTime()) ? null : date;
        }
        
        // Handle numeric timestamp (number type)
        if (typeof date === 'number') {
             const d = new Date(date);
             return isNaN(d.getTime()) ? null : d;
        }
        
        // Handle strings
        if (typeof date === 'string') {
            // Numeric string (e.g. "1696512345678")
            if (!isNaN(Number(date)) && !date.includes('-') && !date.includes(':')) {
                 const d = new Date(Number(date));
                 return isNaN(d.getTime()) ? null : d;
            }
            // ISO string or other formats
            const d = new Date(date);
            return isNaN(d.getTime()) ? null : d;
        }
    } catch (e) {
        console.warn("Date parsing error", e);
        return null;
    }
    
    return null;
};

export const isValidDate = (date: any): boolean => {
    return parseDate(date) !== null;
};

// Returns "Oct 5, 2023, 2:30 PM EDT" - Handles Timezone correctly
export const formatLocalTime = (date: Date | string | number | undefined | null): string => {
    const d = parseDate(date);
    if (!d) return 'TBD'; 
    
    try {
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short' // Critical for live events/auctions
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

// Returns "Oct 5, 2023"
export const formatDate = (date: Date | string | number | undefined | null): string => {
    const d = parseDate(date);
    if (!d) return '';
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Returns "2:30 PM"
export const formatChatTimestamp = (date: Date | string | number | undefined | null): string => {
    const d = parseDate(date);
    if (!d) return '';
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

// Returns "10/05/23 2:30 PM" (Compact)
export const formatShortDateTime = (date: Date | string | number | undefined | null): string => {
    const d = parseDate(date);
    if (!d) return '';
    return d.toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit'
    });
};

export const formatSmartDate = (date: Date | string | number | undefined | null): string => {
    const d = parseDate(date);
    if (!d) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const getRelativeDateLabel = (date: Date | string | number | undefined | null): string => {
    const d = parseDate(date);
    if (!d) return '';
    const now = new Date();
    
    if (d.toDateString() === now.toDateString()) return 'Today';
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

export interface TimeRemaining {
    total: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
}

export const getTimeRemaining = (targetDate: Date | string | number | undefined | null): TimeRemaining => {
    const d = parseDate(targetDate);
    
    // If no date or invalid date, treat as expired/invalid
    if (!d || isNaN(d.getTime())) {
        return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    
    const total = d.getTime() - new Date().getTime();
    if (total <= 0) {
        return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const seconds = Math.floor((total / 1000) % 60);
    
    return { total, days, hours, minutes, seconds, isExpired: false };
};
