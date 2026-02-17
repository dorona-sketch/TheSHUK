import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Listing, ListingType } from '../types';
import { ListingCard } from './ListingCard';

interface CombinedHomeProps {
  onNavigate: (listing: Listing) => void;
  onSelectMode: (mode: 'MARKET' | 'BREAKS') => void;
  onInteract: (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => void;
  currentUserId?: string;
}

export const CombinedHome: React.FC<CombinedHomeProps> = ({ onNavigate, onSelectMode, onInteract, currentUserId }) => {
  const { getEndingSoonSales, getClosingBreaks, loading } = useStore();
  const [sales, setSales] = useState<Listing[]>([]);
  const [breaks, setBreaks] = useState<Listing[]>([]);

  useEffect(() => {
      setSales(getEndingSoonSales(3));
      setBreaks(getClosingBreaks(3));
  }, [getEndingSoonSales, getClosingBreaks]);

  if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-breakhit-border border-t-breakhit-primary rounded-full animate-spin"></div>
            <div className="text-breakhit-muted font-medium animate-pulse">Loading experience...</div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-12 animate-fade-in-up">
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <button
          type="button"
          onClick={() => onSelectMode('MARKET')}
          className="relative overflow-hidden rounded-2xl border border-cyan-700/70 bg-gradient-to-br from-cyan-700/25 to-slate-900 p-4 text-left min-h-[104px] md:min-h-[128px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breakhit-primary active:scale-[0.99] transition-transform"
        >
          <div className="text-2xl md:text-3xl mb-1">🛍️</div>
          <h2 className="text-sm md:text-xl font-black text-white tracking-tight font-display">Marketplace</h2>
          <p className="text-cyan-200 text-[11px] md:text-xs font-semibold uppercase tracking-wider">Browse cards & sealed</p>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('BREAKS')}
          className="relative overflow-hidden rounded-2xl border border-fuchsia-700/70 bg-gradient-to-br from-fuchsia-700/25 to-slate-900 p-4 text-left min-h-[104px] md:min-h-[128px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breakhit-primary active:scale-[0.99] transition-transform"
        >
          <div className="text-2xl md:text-3xl mb-1">📺</div>
          <h2 className="text-sm md:text-xl font-black text-white tracking-tight font-display">Breaks</h2>
          <p className="text-fuchsia-200 text-[11px] md:text-xs font-semibold uppercase tracking-wider">Join before closing</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 px-1 border-b border-breakhit-border pb-2">
            <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              3 Breaks Closest to End
            </h3>
            <button type="button" onClick={() => onSelectMode('BREAKS')} className="min-h-[40px] px-2 text-xs font-bold text-breakhit-muted hover:text-white uppercase tracking-wider">View All</button>
          </div>

          {breaks.length > 0 ? (
            <div className="space-y-3">
              {breaks.map((l) => (
                <div key={l.id} onClick={() => onNavigate(l)} className="cursor-pointer">
                  <ListingCard listing={l} onInteract={onInteract} actionLabel="Join" currentUserId={currentUserId} compact={true} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-breakhit-border rounded-xl bg-breakhit-surface/50 min-h-[200px]">
              <p className="text-breakhit-silver font-medium text-sm">No breaks closing soon.</p>
            </div>
          )}
        </section>

        <section className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 px-1 border-b border-breakhit-border pb-2">
            <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              3 Sales Closest to End
            </h3>
            <button type="button" onClick={() => onSelectMode('MARKET')} className="min-h-[40px] px-2 text-xs font-bold text-breakhit-muted hover:text-white uppercase tracking-wider">View All</button>
          </div>

          {sales.length > 0 ? (
            <div className="space-y-3">
              {sales.map((l) => (
                <div key={l.id} onClick={() => onNavigate(l)} className="cursor-pointer">
                  <ListingCard listing={l} onInteract={onInteract} actionLabel={l.type === ListingType.AUCTION ? 'Bid' : 'Buy'} currentUserId={currentUserId} compact={true} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-breakhit-border rounded-xl bg-breakhit-surface/50 min-h-[200px]">
              <p className="text-breakhit-silver font-medium text-sm">No sales closing soon.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
