import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Listing, ListingType } from '../types';
import { ListingCard } from './ListingCard';

interface CombinedSplitViewProps {
    onNavigate: (listing: Listing) => void;
    onInteract: (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => void;
    currentUserId?: string;
}

export const CombinedSplitView: React.FC<CombinedSplitViewProps> = ({ onNavigate, onInteract, currentUserId }) => {
    const { listings, filters } = useStore();
    const [expandedPanel, setExpandedPanel] = useState<'MARKET' | 'BREAKS' | null>(null);

    // Filter Logic specific to this view (ignores AppMode, effectively)
    const { marketListings, breakListings } = useMemo(() => {
        let base = listings;
        
        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            base = base.filter(l => l.title.toLowerCase().includes(q) || l.setName?.toLowerCase().includes(q));
        }

        const market = base.filter(l => l.type !== ListingType.TIMED_BREAK && !l.isSold);
        const breaks = base.filter(l => l.type === ListingType.TIMED_BREAK);

        // Sort: Ending Soonest by default for this view
        market.sort((a, b) => new Date(a.endsAt || a.createdAt).getTime() - new Date(b.endsAt || b.createdAt).getTime());
        breaks.sort((a, b) => {
            const aFullness = (a.currentParticipants || 0) / (a.targetParticipants || 1);
            const bFullness = (b.currentParticipants || 0) / (b.targetParticipants || 1);
            return bFullness - aFullness;
        });

        return { marketListings: market, breakListings: breaks };
    }, [listings, filters.searchQuery]);

    const renderColumn = (title: string, items: Listing[], type: 'MARKET' | 'BREAKS') => {
        const isExpanded = expandedPanel === type;
        const isHidden = expandedPanel && expandedPanel !== type;

        if (isHidden) return null;

        return (
            <div className={`flex flex-col h-1/2 md:h-full transition-all duration-300 ${isExpanded ? 'w-full h-full' : 'w-full md:w-1/2'} border-b md:border-b-0 md:border-r border-shuk-border last:border-0 bg-shuk-dark`}>
                {/* Fixed Header */}
                <div className="p-3 border-b border-shuk-border bg-shuk-surface flex justify-between items-center shrink-0 h-14">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-lg">{type === 'MARKET' ? '🛍️' : '📺'}</span>
                        <h2 className="font-bold text-shuk-silver text-sm uppercase tracking-wider truncate">{title}</h2>
                        <span className="text-[10px] text-shuk-muted bg-shuk-dark px-1.5 py-0.5 rounded border border-shuk-border">{items.length}</span>
                    </div>
                    <button 
                        onClick={() => setExpandedPanel(isExpanded ? null : type)}
                        className="text-shuk-primary hover:text-white p-1.5 rounded hover:bg-shuk-border transition-colors focus:outline-none focus:ring-2 focus:ring-shuk-primary"
                        title={isExpanded ? "Collapse" : "Expand"}
                        aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isExpanded 
                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /> 
                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /> 
                            }
                        </svg>
                    </button>
                </div>

                {/* Independent Scroll Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-shuk-muted text-xs text-center border-2 border-dashed border-shuk-border rounded-lg m-2">
                            <p>No listings found.</p>
                        </div>
                    ) : (
                        // Grid adjusts based on expansion, but defaults to single column compact rows in split view for readability
                        <div className={`grid gap-3 ${isExpanded ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                            {items.map(listing => (
                                <div key={listing.id} onClick={() => onNavigate(listing)} className="cursor-pointer">
                                    <ListingCard 
                                        listing={listing}
                                        onInteract={onInteract}
                                        actionLabel={type === 'MARKET' ? (listing.type === ListingType.AUCTION ? 'Bid' : 'Buy') : 'Join'}
                                        currentUserId={currentUserId}
                                        enableHoverPreview={false}
                                        compact={true} // Use compact layout to avoid nesting frames
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        // Flex column on mobile, row on desktop
        <div className="flex flex-col md:flex-row w-full h-full overflow-hidden bg-shuk-dark">
            {renderColumn("Marketplace", marketListings, 'MARKET')}
            {renderColumn("Live Breaks", breakListings, 'BREAKS')}
        </div>
    );
};