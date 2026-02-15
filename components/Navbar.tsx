
import React, { useState, useRef, useEffect } from 'react';
import { User, AppMode } from '../types';
import { useChat } from '../context/ChatContext';
import { useStore } from '../context/StoreContext';
import { NotificationDropdown } from './NotificationDropdown';

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
          case AppMode.MARKETPLACE: return 'Marketplace Only';
          case AppMode.BREAKS: return 'Breaks Only';
          case AppMode.COMBINED: return 'Combined View';
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
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-6">
            <div 
                className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
                onClick={handleLogoClick}
            >
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                P
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight hidden sm:block">PokeVault</span>
            </div>

            {/* App Mode Segmented Control (Desktop) */}
            <div className="hidden md:flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                    onClick={() => setAppMode(AppMode.MARKETPLACE)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        appMode === AppMode.MARKETPLACE 
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    Marketplace
                </button>
                <button
                    onClick={() => setAppMode(AppMode.BREAKS)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        appMode === AppMode.BREAKS 
                        ? 'bg-white text-purple-700 shadow-sm ring-1 ring-black/5' 
                        : 'text-gray-500 hover:text-purple-700 hover:bg-gray-200/50'
                    }`}
                >
                    Breaks
                </button>
                <button
                    onClick={() => setAppMode(AppMode.COMBINED)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        appMode === AppMode.COMBINED 
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    All
                </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
                onClick={() => onNavigate('COMMUNITY')}
                className="hidden md:flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-primary-600 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Community
            </button>

            {currentUser ? (
                <>
                    {/* Admin Moderation Link */}
                    {currentUser.isAdmin && (
                        <button 
                            onClick={() => onNavigate('MODERATION')}
                            className="hidden md:flex items-center text-sm font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full border border-red-200 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Mod
                        </button>
                    )}

                    {/* Seller Dashboard Link (Only for Sellers) */}
                    {currentUser.role === 'SELLER' && (
                        <button 
                            onClick={() => onNavigate('DASHBOARD')}
                            className="hidden md:flex items-center text-sm font-bold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full border border-primary-200 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Dashboard
                        </button>
                    )}

                    {/* Notification Bell */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-full transition-colors relative"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadNotifs > 0 && (
                                <span className="absolute top-1 right-1 inline-flex items-center justify-center w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white"></span>
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
                        className="relative p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-full transition-colors"
                        aria-label="Messages"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        {totalUnreadCount > 0 && (
                            <span className="absolute top-1 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full min-w-[18px]">
                                {totalUnreadCount}
                            </span>
                        )}
                    </button>

                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-full transition-colors"
                        onClick={() => onNavigate('PROFILE')}
                    >
                         <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200 overflow-hidden">
                            {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                currentUser.name.charAt(0)
                            )}
                         </div>
                         <div className="hidden md:block text-sm font-medium text-gray-700">
                             {currentUser.name}
                         </div>
                    </div>
                </>
            ) : (
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => onNavigate('LOGIN')}
                        className="text-gray-500 hover:text-gray-900 font-medium text-sm"
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => onNavigate('REGISTER')}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
                    >
                        Register
                    </button>
                </div>
            )}
          </div>
        </div>
        
        {/* Mobile Mode Switcher */}
        <div className="md:hidden py-2 border-t border-gray-100 flex justify-between px-4 items-center">
            <button onClick={handleModeToggle} className="text-xs text-gray-500 font-medium flex items-center gap-1">
                View: <span className="text-primary-600">{getModeLabel()}</span>
            </button>
            <div className="flex items-center gap-4">
                <button 
                    onClick={onSell}
                    className="text-xs font-bold text-gray-900 flex items-center gap-1"
                >
                    Sell
                </button>
                <button 
                    onClick={() => onNavigate('COMMUNITY')}
                    className="text-xs font-bold text-gray-600 flex items-center gap-1"
                >
                    Community
                </button>
            </div>
        </div>
      </div>
    </nav>
  );
});
