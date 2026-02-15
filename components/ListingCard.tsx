
import React, { useRef, useState } from 'react';
import { Listing, ListingType, BreakStatus, ProductCategory } from '../types';
import { Countdown } from './Countdown';
import { ShukFrame } from './ui/ShukFrame';

interface ListingCardProps {
  listing: Listing;
  onInteract: (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => void;
  actionLabel: string;
  enableHoverPreview?: boolean;
  currentUserId?: string;
  compact?: boolean; // New prop for Split View
}

export const ListingCard = React.memo<ListingCardProps>(({ 
  listing, 
  onInteract, 
  actionLabel, 
  enableHoverPreview = false,
  currentUserId,
  compact = false
}) => {
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const isAuction = listing.type === ListingType.AUCTION;
  const isBreak = listing.type === ListingType.TIMED_BREAK;
  const isGraded = listing.category === ProductCategory.GRADED_CARD;
  const isOwner = currentUserId && listing.sellerId === currentUserId;
  const isEnded = listing.isSold || (isBreak && (listing.breakStatus === BreakStatus.EXPIRED || listing.breakStatus === BreakStatus.COMPLETED || listing.breakStatus === BreakStatus.CANCELLED));

  let targetDate: Date | string | undefined | null;
  let timerLabel = '';
  
  if (isAuction) {
      targetDate = listing.endsAt;
  } else if (isBreak) {
      if (listing.breakStatus === BreakStatus.SCHEDULED) {
          targetDate = listing.scheduledLiveAt;
          timerLabel = 'Live in';
      } else if (listing.breakStatus === BreakStatus.OPEN) {
          targetDate = listing.closesAt;
          timerLabel = 'Closes';
      }
  }

  const handleMainAction = (e: React.MouseEvent) => {
      e.preventDefault(); 
      e.stopPropagation();
      if (isOwner) {
          onInteract(listing, 'MANAGE');
          return;
      }
      if (!isEnded) {
          onInteract(listing, isBreak ? 'BUY' : isAuction ? 'BID' : 'BUY');
      }
  };

  const imageUrl = imgError ? 'https://via.placeholder.com/400x533?text=No+Image' : listing.imageUrl;

  // --- COMPACT RENDER (For Split View) ---
  if (compact) {
      return (
        <div className="flex bg-shuk-surface border border-shuk-border rounded-lg overflow-hidden h-28 hover:bg-shuk-surfaceHigh transition-colors group relative">
            {/* Image */}
            <div className="w-24 h-full bg-black relative flex-shrink-0">
                <img 
                    src={imageUrl} 
                    alt={listing.title}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
                {isBreak && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-bold">
                        {listing.breakStatus}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                <div>
                    <h3 className="text-sm font-bold text-gray-200 leading-tight line-clamp-2 mb-1" title={listing.title}>
                        {listing.title}
                    </h3>
                    <div className="text-xs text-gray-500 truncate">{listing.setName}</div>
                </div>
                
                <div className="flex items-end justify-between mt-2">
                    <div>
                        <div className="text-xs text-gray-400 font-medium">
                            {isAuction ? 'Current Bid' : (isBreak ? 'Entry' : 'Price')}
                        </div>
                        <div className="text-sm font-bold text-shuk-primary">
                            ${isAuction ? (listing.currentBid || listing.price).toLocaleString() : listing.price.toLocaleString()}
                        </div>
                    </div>
                    
                    <button
                        onClick={handleMainAction}
                        disabled={!isOwner && isEnded}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider 
                            ${isOwner 
                                ? 'bg-gray-700 text-gray-200' 
                                : 'bg-shuk-primary text-shuk-dark hover:bg-cyan-300'
                            }`}
                    >
                        {isOwner ? 'Edit' : actionLabel}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- STANDARD RENDER (Grid View) ---
  return (
    <div ref={cardRef} className="group relative h-full">
      <ShukFrame variant="card" interactive={true} className="h-full flex flex-col">
          <div className="aspect-[3/4] w-full overflow-hidden bg-shuk-surfaceHigh relative">
            <img 
                src={imageUrl} 
                alt={listing.title} 
                loading="lazy"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105" 
            />
            
            {isGraded && listing.gradingCompany && listing.grade && (
                <div className="absolute top-2 right-2 bg-shuk-dark/90 backdrop-blur border border-shuk-border shadow-lg px-2 py-1 rounded flex flex-col items-center leading-none z-10">
                    <span className="text-[10px] font-bold text-shuk-muted uppercase">{listing.gradingCompany}</span>
                    <span className="text-lg font-black text-shuk-primary">{listing.grade}</span>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0">
                {targetDate && !isEnded && (
                    <div className="py-1 px-2 text-center backdrop-blur-md bg-black/60 text-white border-t border-white/10">
                        <Countdown 
                            targetDate={targetDate} 
                            label={timerLabel}
                            className="text-xs font-bold tracking-wider uppercase"
                        />
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex flex-col flex-1 p-3 bg-shuk-surface">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">{listing.title}</h3>
            </div>
            
            <div className="mt-3 pt-3 border-t border-shuk-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">{isAuction ? 'Bid' : 'Price'}</p>
                  <p className="text-lg font-bold text-white">${isAuction ? (listing.currentBid || listing.price).toLocaleString() : listing.price.toLocaleString()}</p>
                </div>
                <button
                    onClick={handleMainAction}
                    className="bg-shuk-primary/10 text-shuk-primary hover:bg-shuk-primary hover:text-shuk-dark border border-shuk-primary/50 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all"
                >
                    {actionLabel}
                </button>
            </div>
          </div>
      </ShukFrame>
    </div>
  );
});
