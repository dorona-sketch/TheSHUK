
import React, { useState, useEffect } from 'react';
import { getTimeRemaining, TimeRemaining, formatLocalTime } from '../utils/dateUtils';

interface CountdownProps {
    targetDate: Date | string | number | undefined | null;
    onComplete?: () => void;
    label?: string; // Optional prefix text e.g. "Closes in"
    fallback?: React.ReactNode; // Content to show when expired (default null)
    className?: string;
    showSeconds?: boolean;
    compact?: boolean; // Use short notation like "2d 4h" vs "2 Days 4 Hours" (default: true)
}

export const Countdown: React.FC<CountdownProps> = ({ 
    targetDate, 
    onComplete, 
    label, 
    fallback = null, 
    className = '', 
    showSeconds = false,
    compact = true
}) => {
    const [timeLeft, setTimeLeft] = useState<TimeRemaining>(getTimeRemaining(targetDate));

    useEffect(() => {
        // Immediate check on mount/update
        const checkTimer = () => {
            const remaining = getTimeRemaining(targetDate);
            setTimeLeft(remaining);
            if (remaining.isExpired && onComplete) {
                onComplete();
            }
            return remaining;
        };

        const initial = checkTimer();
        // If already expired, no need to set interval
        if (initial.isExpired) return;

        const interval = setInterval(() => {
            const current = checkTimer();
            if (current.isExpired) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate, onComplete]);

    if (timeLeft.isExpired) {
        return <span className={className}>{fallback}</span>;
    }

    const formatUnit = (val: number) => val.toString().padStart(2, '0');

    let timeString = '';
    
    // Logic: 
    // > 24h: Show Days + Hours
    // < 24h: Show Hours + Minutes (+ Seconds if enabled)
    // < 1h: Show Minutes + Seconds
    
    if (timeLeft.days > 0) {
        timeString = compact 
            ? `${timeLeft.days}d ${timeLeft.hours}h` 
            : `${timeLeft.days} Days ${timeLeft.hours} Hours`;
    } else if (timeLeft.hours > 0) {
        timeString = compact 
            ? `${timeLeft.hours}h ${timeLeft.minutes}m` 
            : `${timeLeft.hours} Hours ${timeLeft.minutes} Minutes`;
        if (showSeconds) {
             timeString += compact 
                ? ` ${formatUnit(timeLeft.seconds)}s` 
                : ` ${formatUnit(timeLeft.seconds)} Seconds`;
        }
    } else {
        // Less than an hour
        timeString = compact 
            ? `${timeLeft.minutes}m ${formatUnit(timeLeft.seconds)}s` 
            : `${timeLeft.minutes} Minutes ${formatUnit(timeLeft.seconds)} Seconds`;
    }

    return (
        <span 
            className={className} 
            suppressHydrationWarning 
            title={`Local Time: ${formatLocalTime(targetDate)}`} // Accessibility & Usability
        >
            {label ? `${label} ${timeString}` : timeString}
        </span>
    );
};
