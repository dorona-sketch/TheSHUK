import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { useChat } from '../context/ChatContext';
import { useStore } from '../context/StoreContext';
import { NotificationDropdown } from './NotificationDropdown';
import { BreakHitLogo } from './assets/BreakHitLogo';

interface NavbarProps {
  currentUser: User | null;
  onNavigate: (view: any, id?: string) => void;
  onSell: () => void;
}

export const Navbar = React.memo<NavbarProps>(({ currentUser, onNavigate, onSell }) => {
  const { totalUnreadCount } = useChat();
  const { notifications } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  const handleLogoClick = () => onNavigate('HOME');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 safe-area-pt safe-area-px bg-breakhit-dark/90 backdrop-blur-md border-b border-breakhit-border shadow-lg" role="navigation" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 md:h-16">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <div
              className="flex-shrink-0 min-w-0 flex items-center gap-2 md:gap-3 cursor-pointer group"
              onClick={handleLogoClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
              aria-label="Go to Home"
            >
              <BreakHitLogo className="h-7 w-7 md:h-8 md:w-8 text-breakhit-primary group-hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] transition-all" />
              <div className="min-w-0 flex flex-col">
                <span className="font-display font-bold text-sm sm:text-lg md:text-xl leading-tight text-breakhit-silver tracking-tight group-hover:text-white transition-colors truncate">BREAK-HIT</span>
                <span className="hidden sm:block text-[9px] text-breakhit-primary tracking-[0.2em] font-medium leading-none">COLLECTIBLES</span>
              </div>
            </div>

          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
            <button
              onClick={() => onNavigate('COMMUNITY')}
              className="hidden md:flex items-center gap-1.5 text-sm font-bold text-breakhit-muted hover:text-breakhit-primary transition-colors focus:outline-none focus:text-breakhit-primary"
            >
              Community
            </button>

            {currentUser ? (
              <>
                {currentUser.role === 'SELLER' && (
                  <button
                    onClick={() => onNavigate('DASHBOARD')}
                    className="hidden md:flex items-center text-sm font-bold text-breakhit-silver hover:text-white bg-breakhit-surfaceHigh hover:bg-breakhit-border px-3 py-1.5 rounded-full border border-breakhit-border transition-colors"
                  >
                    Dashboard
                  </button>
                )}

                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-10 h-10 inline-flex items-center justify-center text-breakhit-muted hover:text-breakhit-primary hover:bg-breakhit-surfaceHigh rounded-full transition-colors relative"
                    aria-label={`Notifications ${unreadNotifs > 0 ? `(${unreadNotifs} unread)` : ''}`}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    {unreadNotifs > 0 && <span className="absolute top-1 right-1 inline-flex items-center justify-center w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-breakhit-dark"></span>}
                  </button>
                  {showNotifications && <NotificationDropdown onClose={() => setShowNotifications(false)} onNavigate={(id) => onNavigate('DETAILS', id)} />}
                </div>

                <button onClick={() => onNavigate('CHAT')} className="relative w-10 h-10 inline-flex items-center justify-center text-breakhit-muted hover:text-breakhit-primary hover:bg-breakhit-surfaceHigh rounded-full transition-colors" aria-label={`Messages ${totalUnreadCount > 0 ? `(${totalUnreadCount} unread)` : ''}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  {totalUnreadCount > 0 && <span className="absolute top-1 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-breakhit-dark translate-x-1/4 -translate-y-1/4 bg-breakhit-primary rounded-full min-w-[18px]">{totalUnreadCount}</span>}
                </button>

                <div className="flex items-center gap-2 cursor-pointer hover:bg-breakhit-surfaceHigh px-2 py-1.5 min-h-[40px] rounded-full transition-colors" onClick={() => onNavigate('PROFILE')} role="button" tabIndex={0} aria-label="User Profile">
                  <div className="h-8 w-8 rounded-full bg-breakhit-surface border border-breakhit-border flex items-center justify-center text-breakhit-silver font-bold overflow-hidden">
                    {currentUser.avatar ? <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" /> : currentUser.name.charAt(0)}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={() => onNavigate('LOGIN')} className="text-breakhit-muted hover:text-breakhit-silver font-medium text-xs sm:text-sm px-1">Sign In</button>
                <button onClick={() => onNavigate('REGISTER')} className="bg-breakhit-primary text-breakhit-dark px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md font-bold text-xs sm:text-sm">Join</button>
              </div>
            )}
          </div>
        </div>
        <div className="md:hidden py-2 border-t border-breakhit-border flex justify-end gap-2 px-1 items-center bg-breakhit-dark">
          <button onClick={onSell} className="text-xs font-bold text-breakhit-silver min-h-[40px] px-2">Sell</button>
          <button onClick={() => onNavigate('COMMUNITY')} className="text-xs font-bold text-breakhit-muted min-h-[40px] px-2">Community</button>
        </div>
      </div>
    </nav>
  );
});
