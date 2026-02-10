
import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Listing, ListingType } from '../types';
import { ListingCard } from './ListingCard';

interface CombinedHomeProps {
  onNavigate: (listing: Listing) => void;
  onSelectMode: (mode: 'MARKET' | 'BREAKS') => void;
  onInteract: (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => void;
}

export const CombinedHome: React.FC<CombinedHomeProps> = ({ onNavigate, onSelectMode, onInteract }) => {
  const { getEndingSoonAuctions, getClosingBreaks, loading, currentUser } = useStore();
  const [auctions, setAuctions] = useState<Listing[]>([]);
  const [breaks, setBreaks] = useState<Listing[]>([]);

  useEffect(() => {
      // REQUIREMENT: Exacty 3 items
      setAuctions(getEndingSoonAuctions(3));
      setBreaks(getClosingBreaks(3));
  }, [getEndingSoonAuctions, getClosingBreaks]);

  if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <div className="text-gray-400 font-medium animate-pulse">Loading experience...</div>
        </div>
      );
  }

  return (
    <div className="space-y-12 pb-12 animate-fade-in-up">
        
        {/* Hero / Chooser Section */}
        <div className="relative py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50 rounded-3xl mb-12 border border-gray-100 overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            
            <div className="text-center max-w-3xl mx-auto mb-10 relative z-10">
                <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
                    The Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Collector's Hub</span>
                </h1>
                <p className="text-lg text-gray-500">
                    Buy, sell, and break with confidence. Choose your experience below.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Marketplace Card */}
                <button 
                    onClick={() => onSelectMode('MARKET')}
                    className="group relative flex flex-col items-start p-8 bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 text-left overflow-hidden h-full transform hover:-translate-y-1"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Decorative Circle */}
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>

                    <div className="relative z-10 w-full">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-200 group-hover:rotate-6 transition-transform">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Marketplace</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed text-sm h-10">
                            Discover rare singles, graded slabs, and sealed products. Buy now or bid in auctions.
                        </p>
                        <div className="flex items-center text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-full w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            Browse Cards <span className="ml-2">→</span>
                        </div>
                    </div>
                </button>

                {/* Breaks Card */}
                <button 
                    onClick={() => onSelectMode('BREAKS')}
                    className="group relative flex flex-col items-start p-8 bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 text-left overflow-hidden h-full transform hover:-translate-y-1"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Decorative Circle */}
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>

                    <div className="relative z-10 w-full">
                        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-purple-200 group-hover:-rotate-6 transition-transform">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Live Breaks</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed text-sm h-10">
                            Join community box openings. Secure your spot, watch live, and get hits shipped.
                        </p>
                        <div className="flex items-center text-purple-600 font-bold text-sm bg-purple-50 px-4 py-2 rounded-full w-fit group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            Join Breaks <span className="ml-2">→</span>
                        </div>
                    </div>
                </button>
            </div>
        </div>

        {/* Closing Soon Breaks */}
        <section>
            <div className="flex justify-between items-center mb-6 px-2 border-b border-gray-100 pb-2">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    Breaks Closing Soon
                </h3>
                <button onClick={() => onSelectMode('BREAKS')} className="text-sm font-bold text-purple-600 hover:text-purple-700 hover:underline">View All</button>
            </div>
            
            {breaks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {breaks.map(l => (
                        <div key={l.id} onClick={() => onNavigate(l)} className="cursor-pointer transform hover:-translate-y-1 transition-transform duration-200">
                            <ListingCard 
                                listing={l} 
                                onInteract={onInteract} 
                                actionLabel="Join" 
                                currentUserId={currentUser?.id} 
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 rounded-xl p-12 text-center border-2 border-dashed border-gray-200">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-gray-900 font-medium text-lg">No breaks are closing right now</p>
                    <p className="text-gray-500 mb-4">Be the first to join a new break!</p>
                    <button onClick={() => onSelectMode('BREAKS')} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                        Explore All Breaks
                    </button>
                </div>
            )}
        </section>

        {/* Auctions Ending Soon */}
        <section>
             <div className="flex justify-between items-center mb-6 px-2 border-b border-gray-100 pb-2">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Auctions Ending Soon
                </h3>
                <button onClick={() => onSelectMode('MARKET')} className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">View All</button>
            </div>

            {auctions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {auctions.map(l => (
                        <div key={l.id} onClick={() => onNavigate(l)} className="cursor-pointer transform hover:-translate-y-1 transition-transform duration-200">
                            <ListingCard 
                                listing={l} 
                                onInteract={onInteract} 
                                actionLabel="Bid" 
                                currentUserId={currentUser?.id} 
                            />
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="bg-gray-50 rounded-xl p-12 text-center border-2 border-dashed border-gray-200">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <p className="text-gray-900 font-medium text-lg">No auctions ending soon</p>
                    <p className="text-gray-500 mb-4">Check back later or browse active listings.</p>
                    <button onClick={() => onSelectMode('MARKET')} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                        Browse Marketplace
                    </button>
                </div>
            )}
        </section>

    </div>
  );
};
