import React, { useState, useRef, useEffect } from 'react';
import { User, AppMode } from '../types';
import { useChat } from '../context/ChatContext';
import { useStore } from '../context/StoreContext';
import { NotificationDropdown } from './NotificationDropdown';
import { ShukLogo } from './assets/ShukLogo';

interface NavbarProps {
  currentUser: User | null;
  onNavigate: (view: any, id?: string) => void;
  onSell: () => void;
}

export const Navbar = React.memo<NavbarProps>(({ currentUser, onNavigate, onSell }) => {
  const { totalUnreadCount } = useChat();
  const { appMode, setAppMode, notifications } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  const handleModeToggle = () => {
      if (appMode === AppMode.MARKETPLACE) setAppMode(AppMode.BREAKS);
      else if (appMode === AppMode.BREAKS) setAppMode(AppMode.COMBINED);
      else setAppMode(AppMode.MARKETPLACE);
  };

  const getModeLabel = () => {
      switch(appMode) {
          case AppMode.MARKETPLACE: return 'Marketplace';
          case AppMode.BREAKS: return 'Live Breaks';
          case AppMode.COMBINED: return 'The Shuk';
      }
  };

  const handleLogoClick = () => {
      if (appMode === AppMode.COMBINED) onNavigate('HOME');
      else onNavigate('MARKETPLACE');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-shuk-dark/90 backdrop-blur-md border-b border-shuk-border shadow-lg" role="navigation" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-6">
            <div 
                className="flex-shrink-0 flex items-center gap-3 cursor-pointer group"
                onClick={handleLogoClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
                aria-label="Go to Home"
            >
              <ShukLogo className="h-8 w-8 text-shuk-primary group-hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] transition-all" />
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl text-shuk-silver tracking-tight group-hover:text-white transition-colors">THE DIGITAL SHUK</span>
                <span className="text-[9px] text-shuk-primary tracking-[0.2em] font-medium leading-none">COLLECTIBLES</span>
              </div>
            </div>

            {/* App Mode Segmented Control (Desktop) */}
            <div className="hidden md:flex bg-shuk-surface p-1 rounded-lg border border-shuk-border">
                <button
                    onClick={() => setAppMode(AppMode.MARKETPLACE)}
                    aria-pressed={appMode === AppMode.MARKETPLACE}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-shuk-primary ${
                        appMode === AppMode.MARKETPLACE 
                        ? 'bg-shuk-primary text-shuk-dark shadow-sm' 
                        : 'text-shuk-muted hover:text-shuk-silver hover:bg-shuk-surfaceHigh'
                    }`}
                >
                    Market
                </button>
                <button
                    onClick={() => setAppMode(AppMode.BREAKS)}
                    aria-pressed={appMode === AppMode.BREAKS}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-shuk-primary ${
                        appMode === AppMode.BREAKS 
                        ? 'bg-shuk-primary text-shuk-dark shadow-sm' 
                        : 'text-shuk-muted hover:text-shuk-silver hover:bg-shuk-surfaceHigh'
                    }`}
                >
                    Breaks
                </button>
                <button
                    onClick={() => setAppMode(AppMode.COMBINED)}
                    aria-pressed={appMode === AppMode.COMBINED}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-shuk-primary ${
                        appMode === AppMode.COMBINED 
                        ? 'bg-shuk-primary text-shuk-dark shadow-sm' 
                        : 'text-shuk-muted hover:text-shuk-silver hover:bg-shuk-surfaceHigh'
                    }`}
                >
                    All
                </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
                onClick={() => onNavigate('COMMUNITY')}
                className="hidden md:flex items-center gap-1.5 text-sm font-bold text-shuk-muted hover:text-shuk-primary transition-colors focus:outline-none focus:text-shuk-primary"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Community
            </button>

            {currentUser ? (
                <>
                    {currentUser.role === 'SELLER' && (
                        <button 
                            onClick={() => onNavigate('DASHBOARD')}
                            className="hidden md:flex items-center text-sm font-bold text-shuk-silver hover:text-white bg-shuk-surfaceHigh hover:bg-shuk-border px-3 py-1.5 rounded-full border border-shuk-border transition-colors focus:outline-none focus:ring-2 focus:ring-shuk-primary"
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Dashboard
                        </button>
                    )}

                    {/* Notification Bell */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 text-shuk-muted hover:text-shuk-primary hover:bg-shuk-surfaceHigh rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-shuk-primary"
                            aria-label={`Notifications ${unreadNotifs > 0 ? `(${unreadNotifs} unread)` : ''}`}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadNotifs > 0 && (
                                <span className="absolute top-1 right-1 inline-flex items-center justify-center w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-shuk-dark"></span>
                            )}
                        </button>
                        {showNotifications && (
                            <NotificationDropdown 
                                onClose={() => setShowNotifications(false)}
                                onNavigate={(id) => onNavigate('DETAILS', id)}
                            />
                        )}
                    </div>

                    {/* Chat Icon */}
                    <button 
                        onClick={() => onNavigate('CHAT')}
                        className="relative p-2 text-shuk-muted hover:text-shuk-primary hover:bg-shuk-surfaceHigh rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-shuk-primary"
                        aria-label={`Messages ${totalUnreadCount > 0 ? `(${totalUnreadCount} unread)` : ''}`}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        {totalUnreadCount > 0 && (
                            <span className="absolute top-1 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-shuk-dark transform translate-x-1/4 -translate-y-1/4 bg-shuk-primary rounded-full min-w-[18px]">
                                {totalUnreadCount}
                            </span>
                        )}
                    </button>

                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-shuk-surfaceHigh p-1.5 rounded-full transition-colors focus-within:ring-2 focus-within:ring-shuk-primary"
                        onClick={() => onNavigate('PROFILE')}
                        role="button"
                        tabIndex={0}
                        aria-label="User Profile"
                    >
                         <div className="h-8 w-8 rounded-full bg-shuk-surface border border-shuk-border flex items-center justify-center text-shuk-silver font-bold overflow-hidden">
                            {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                currentUser.name.charAt(0)
                            )}
                         </div>
                    </div>
                </>
            ) : (
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => onNavigate('LOGIN')}
                        className="text-shuk-muted hover:text-shuk-silver font-medium text-sm"
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => onNavigate('REGISTER')}
                        className="bg-shuk-primary text-shuk-dark px-4 py-2 rounded-md font-bold text-sm transition-colors shadow-[0_0_10px_rgba(34,211,238,0.2)] hover:shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                    >
                        Join
                    </button>
                </div>
            )}
          </div>
        </div>
        
        {/* Mobile Mode Switcher */}
        <div className="md:hidden py-2 border-t border-shuk-border flex justify-between px-4 items-center bg-shuk-dark">
            <button onClick={handleModeToggle} className="text-xs text-shuk-muted font-medium flex items-center gap-1 focus:outline-none">
                View: <span className="text-shuk-primary font-bold">{getModeLabel()}</span>
                <svg className="w-3 h-3 text-shuk-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="flex items-center gap-4">
                <button 
                    onClick={onSell}
                    className="text-xs font-bold text-shuk-silver flex items-center gap-1 focus:outline-none active:text-shuk-primary"
                >
                    Sell
                </button>
                <button 
                    onClick={() => onNavigate('COMMUNITY')}
                    className="text-xs font-bold text-shuk-muted flex items-center gap-1 focus:outline-none active:text-shuk-silver"
                >
                    Community
                </button>
            </div>
        </div>
      </div>
    </nav>
  );
});