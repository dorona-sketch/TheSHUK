
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
        if (n.linkTo) {
            onNavigate(n.linkTo);
        }
        onClose();
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'BID_WON': return '🏆';
            case 'SALE': return '💰';
            case 'BREAK_FULL': return '🔥';
            case 'BREAK_LIVE': return '🔴';
            default: return '📢';
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-fade-in-up">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                {notifications.some(n => !n.isRead) && (
                    <button onClick={markAllNotificationsRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                        Mark all read
                    </button>
                )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        No notifications yet.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {notifications.map(n => (
                            <li 
                                key={n.id} 
                                onClick={() => handleClick(n)}
                                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                            >
                                <div className="flex gap-3">
                                    <div className="text-xl">{getIcon(n.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {formatSmartDate(n.createdAt)}
                                        </p>
                                    </div>
                                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5"></div>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
