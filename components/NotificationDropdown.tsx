import React from 'react';
import { useStore } from '../context/StoreContext';
import { Notification } from '../types';
import { formatSmartDate } from '../utils/dateUtils';

interface NotificationDropdownProps {
    onClose: () => void;
    onNavigate: (id: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose, onNavigate }) => {
    const { notifications, markNotificationRead, markAllNotificationsRead } = useStore();

    const handleClick = (n: Notification) => {
        markNotificationRead(n.id);
        if (n.linkTo) onNavigate(n.linkTo);
        onClose();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'BID_WON': return '🏆';
            case 'SALE': return '💰';
            case 'BREAK_FULL': return '🔥';
            case 'BREAK_LIVE': return '🔴';
            default: return '📢';
        }
    };

    return (
        <div className="fixed top-[calc(env(safe-area-inset-top)+56px)] left-3 right-3 md:absolute md:top-auto md:left-auto md:right-0 md:mt-2 md:w-80 bg-breakhit-surface border border-breakhit-border rounded-xl shadow-2xl py-1 z-[70] animate-fade-in-up">
            <div className="px-4 py-3 border-b border-breakhit-border flex justify-between items-center bg-breakhit-surfaceHigh rounded-t-xl">
                <h3 className="font-bold text-breakhit-silver text-sm">Notifications</h3>
                {notifications.some(n => !n.isRead) && (
                    <button onClick={markAllNotificationsRead} className="text-xs text-breakhit-primary hover:text-cyan-300 font-medium min-h-[36px] px-2">
                        Mark all read
                    </button>
                )}
            </div>

            <div className="max-h-[55vh] md:max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-breakhit-muted text-sm">
                        No notifications yet.
                    </div>
                ) : (
                    <ul className="divide-y divide-breakhit-border/60">
                        {notifications.map(n => (
                            <li
                                key={n.id}
                                onClick={() => handleClick(n)}
                                className={`px-4 py-3 hover:bg-breakhit-surfaceHigh cursor-pointer transition-colors ${!n.isRead ? 'bg-breakhit-primary/10' : ''}`}
                            >
                                <div className="flex gap-3">
                                    <div className="text-xl">{getIcon(n.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!n.isRead ? 'font-bold text-white' : 'text-breakhit-silver'}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-breakhit-muted line-clamp-2 mt-0.5">{n.message}</p>
                                        <p className="text-[10px] text-breakhit-muted/80 mt-1">
                                            {formatSmartDate(n.createdAt)}
                                        </p>
                                    </div>
                                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-breakhit-primary mt-1.5"></div>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
