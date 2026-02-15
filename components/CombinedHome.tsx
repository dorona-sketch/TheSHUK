import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Listing, ListingType } from '../types';
import { ListingCard } from './ListingCard';
import { ShukFrame } from './ui/ShukFrame';

interface CombinedHomeProps {
  onNavigate: (listing: Listing) => void;
  onSelectMode: (mode: 'MARKET' | 'BREAKS') => void;
  onInteract: (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => void;
  currentUserId?: string;
}

export const CombinedHome: React.FC<CombinedHomeProps> = ({ onNavigate, onSelectMode, onInteract, currentUserId }) => {
  const { getEndingSoonAuctions, getClosingBreaks, loading } = useStore();
  const [auctions, setAuctions] = useState<Listing[]>([]);
  const [breaks, setBreaks] = useState<Listing[]>([]);

  useEffect(() => {
      setAuctions(getEndingSoonAuctions(3));
      setBreaks(getClosingBreaks(3));
  }, [getEndingSoonAuctions, getClosingBreaks]);

  if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-shuk-border border-t-shuk-primary rounded-full animate-spin"></div>
            <div className="text-shuk-muted font-medium animate-pulse">Loading experience...</div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-12 animate-fade-in-up">
        
        {/* Top Navigation Tiles (Tabs on the same row) */}
        <div className="grid grid-cols-2 gap-4 md:gap-8">
            {/* Marketplace Tile */}
            <div 
                onClick={() => onSelectMode('MARKET')}
                className="relative group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-800 shadow-lg hover:shadow-blue-500/20 transition-all duration-300 h-32 md:h-40 flex flex-col justify-center items-center text-center p-4"
            >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="relative z-10 transform group-hover:-translate-y-1 transition-transform duration-300">
                    <div className="text-3xl md:text-4xl mb-2">🛍️</div>
                    <h2 className="text-lg md:text-2xl font-black text-white tracking-tight font-display mb-0.5">MARKETPLACE</h2>
                    <p className="text-blue-200 text-[10px] md:text-xs font-medium uppercase tracking-widest opacity-80 group-hover:opacity-100">Buy & Sell</p>
                </div>
                <div className="absolute bottom-2 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
                    Enter &rarr;
                </div>
            </div>

            {/* Breaks Tile */}
            <div 
                onClick={() => onSelectMode('BREAKS')}
                className="relative group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 to-slate-900 border border-purple-800 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 h-32 md:h-40 flex flex-col justify-center items-center text-center p-4"
            >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="relative z-10 transform group-hover:-translate-y-1 transition-transform duration-300">
                    <div className="text-3xl md:text-4xl mb-2">📺</div>
                    <h2 className="text-lg md:text-2xl font-black text-white tracking-tight font-display mb-0.5">LIVE BREAKS</h2>
                    <p className="text-purple-200 text-[10px] md:text-xs font-medium uppercase tracking-widest opacity-80 group-hover:opacity-100">Join the Action</p>
                </div>
                <div className="absolute bottom-2 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
                    Enter &rarr;
                </div>
            </div>
        </div>

        {/* Main Content Split: Breaks (Left) | Auctions (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Section 1: Breaks Closing Soon */}
            <section className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 px-2 border-b border-shuk-border pb-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        Breaks Closing Soon
                    </h3>
                    <button onClick={() => onSelectMode('BREAKS')} className="text-xs font-bold text-shuk-muted hover:text-white uppercase tracking-wider">View All</button>
                </div>
                
                {breaks.length > 0 ? (
                    <div className="space-y-3">
                        {breaks.map(l => (
                            <div 
                                key={l.id} 
                                onClick={() => onNavigate(l)} 
                                className="cursor-pointer"
                            >
                                <ListingCard 
                                    listing={l} 
                                    onInteract={onInteract} 
                                    actionLabel="Join" 
                                    currentUserId={currentUserId}
                                    compact={true} // Use compact layout for the list view
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-shuk-border rounded-xl bg-shuk-surface/50 min-h-[200px]">
                        <div className="w-12 h-12 bg-shuk-dark rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500 border border-shuk-border">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-shuk-silver font-medium text-sm">No breaks closing soon.</p>
                        <button onClick={() => onSelectMode('BREAKS')} className="mt-2 text-xs text-shuk-primary hover:underline">
                            Explore All Breaks
                        </button>
                    </div>
                )}
            </section>

            {/* Section 2: Auctions Ending Soon */}
            <section className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 px-2 border-b border-shuk-border pb-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Auctions Ending Soon
                    </h3>
                    <button onClick={() => onSelectMode('MARKET')} className="text-xs font-bold text-shuk-muted hover:text-white uppercase tracking-wider">View All</button>
                </div>

                {auctions.length > 0 ? (
                    <div className="space-y-3">
                        {auctions.map(l => (
                            <div 
                                key={l.id} 
                                onClick={() => onNavigate(l)} 
                                className="cursor-pointer"
                            >
                                <ListingCard 
                                    listing={l} 
                                    onInteract={onInteract} 
                                    actionLabel="Bid" 
                                    currentUserId={currentUserId}
                                    compact={true} // Use compact layout for the list view
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-shuk-border rounded-xl bg-shuk-surface/50 min-h-[200px]">
                        <div className="w-12 h-12 bg-shuk-dark rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500 border border-shuk-border">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <p className="text-shuk-silver font-medium text-sm">No auctions ending soon.</p>
                        <button onClick={() => onSelectMode('MARKET')} className="mt-2 text-xs text-shuk-primary hover:underline">
                            Browse Marketplace
                        </button>
                    </div>
                )}
            </section>
        </div>

        {/* Community Highlight Section */}
        <section className="bg-shuk-surfaceHigh rounded-2xl p-6 border border-shuk-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Join the Community</h3>
                    <p className="text-shuk-muted text-sm max-w-lg">
                        Connect with thousands of collectors in our specialized groups. Share pulls, discuss sets, and trade safely.
                    </p>
                </div>
                <button className="px-6 py-3 bg-shuk-primary text-shuk-dark font-bold rounded-lg hover:bg-cyan-300 transition-colors whitespace-nowrap">
                    Explore Groups
                </button>
            </div>
        </section>

    </div>
  );
};