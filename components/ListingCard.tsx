
import React, { useRef, useState } from 'react';
import { Listing, ListingType, BreakStatus, ProductCategory } from '../types';
import { Countdown } from './Countdown';
import { TAG_DISPLAY_LABELS } from '../constants';

interface ListingCardProps {
  listing: Listing;
  onInteract: (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => void;
  actionLabel: string;
  enableHoverPreview?: boolean;
  currentUserId?: string;
}

export const ListingCard = React.memo<ListingCardProps>(({ 
  listing, 
  onInteract, 
  actionLabel, 
  enableHoverPreview = false,
  currentUserId
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewSide, setPreviewSide] = useState<'left' | 'right'>('right');
  const [previewAlign, setPreviewAlign] = useState<'top' | 'bottom'>('top');
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isAuction = listing.type === ListingType.AUCTION;
  const isBreak = listing.type === ListingType.TIMED_BREAK;
  const isGraded = listing.category === ProductCategory.GRADED_CARD;
  
  const isOwner = currentUserId && listing.sellerId === currentUserId;

  // --- Date & Status Logic ---
  let targetDate: Date | string | undefined | null;
  let timerLabel = '';
  let badgeColorClass = 'bg-gray-900/80 text-amber-400';
  let statusBadge: React.ReactNode = null;

  // Helper to determine button text for sellers
  const getOwnerActionLabel = () => {
      if (isBreak) {
          if (listing.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE) return 'Schedule Now';
          if (listing.breakStatus === BreakStatus.SCHEDULED) return 'Manage Stream';
          if (listing.breakStatus === BreakStatus.LIVE) return 'Host Console';
          if (listing.breakStatus === BreakStatus.COMPLETED) return 'View Results';
      }
      return 'Manage Listing';
  };

  if (isBreak) {
      switch (listing.breakStatus) {
          case BreakStatus.LIVE:
              statusBadge = (
                  <div className="py-2 px-3 text-center bg-red-600/90 text-white backdrop-blur-md">
                      <span className="text-sm font-bold tracking-wider animate-pulse">LIVE NOW</span>
                  </div>
              );
              break;
          case BreakStatus.COMPLETED:
              statusBadge = (
                  <div className="py-2 px-3 text-center bg-gray-800/90 text-green-400 backdrop-blur-md">
                      <span className="text-xs font-bold tracking-wider uppercase">COMPLETED</span>
                  </div>
              );
              break;
          case BreakStatus.EXPIRED:
              statusBadge = (
                  <div className="py-2 px-3 text-center bg-gray-800/90 text-gray-400 backdrop-blur-md">
                      <span className="text-xs font-bold tracking-wider uppercase">EXPIRED</span>
                  </div>
              );
              break;
          case BreakStatus.CANCELLED:
              statusBadge = (
                  <div className="py-2 px-3 text-center bg-red-50/90 text-red-600 backdrop-blur-md border-t-2 border-red-500">
                      <span className="text-xs font-bold tracking-wider uppercase">CANCELLED</span>
                  </div>
              );
              break;
          case BreakStatus.FULL_PENDING_SCHEDULE:
              statusBadge = (
                  <div className="py-2 px-3 text-center bg-indigo-900/95 text-white backdrop-blur-md flex flex-col items-center">
                      <span className="text-xs font-bold tracking-wider uppercase">SOLD OUT</span>
                      {isOwner && <span className="text-[10px] text-indigo-200 font-medium">Ready to Schedule</span>}
                  </div>
              );
              break;
          case BreakStatus.SCHEDULED:
              targetDate = listing.scheduledLiveAt;
              timerLabel = 'Live in';
              badgeColorClass = 'bg-purple-900/80 text-purple-100';
              break;
          case BreakStatus.OPEN:
              targetDate = listing.closesAt;
              timerLabel = 'Closes in';
              badgeColorClass = 'bg-purple-900/80 text-purple-100';
              break;
          default:
              break;
      }
  } else if (isAuction) {
      if (listing.isSold) {
           statusBadge = (
              <div className="py-2 px-3 text-center bg-gray-800/90 text-amber-400 backdrop-blur-md">
                  <span className="text-xs font-bold tracking-wider uppercase">SOLD</span>
              </div>
          );
      } else {
          targetDate = listing.endsAt;
          timerLabel = '';
          badgeColorClass = 'bg-gray-900/85 text-red-400';
      }
  } else {
      // Direct Sale
      if (listing.isSold) {
          statusBadge = (
              <div className="py-2 px-3 text-center bg-gray-800/90 text-gray-300 backdrop-blur-md">
                  <span className="text-xs font-bold tracking-wider uppercase">SOLD</span>
              </div>
          );
      }
  }

  const breakPercent = isBreak && listing.targetParticipants ? (listing.currentParticipants || 0) / listing.targetParticipants * 100 : 0;
  const isBreakFull = isBreak && (listing.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE || listing.breakStatus === BreakStatus.SCHEDULED || listing.breakStatus === BreakStatus.LIVE || listing.breakStatus === BreakStatus.COMPLETED);
  
  const isEnded = listing.isSold || (isBreak && (listing.breakStatus === BreakStatus.EXPIRED || listing.breakStatus === BreakStatus.COMPLETED || listing.breakStatus === BreakStatus.CANCELLED));

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

  const handleMouseEnter = () => {
      if (enableHoverPreview && cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          
          const PREVIEW_WIDTH = 340; // 320px (w-80) + 20px buffer
          const ESTIMATED_HEIGHT = 420; // Approximate height of the preview popover

          // Horizontal Logic
          const spaceRight = windowWidth - rect.right;
          const spaceLeft = rect.left;
          
          // Prefer right side, unless it overflows window
          if (spaceRight < PREVIEW_WIDTH) {
              // If right overflows, try left
              setPreviewSide('left');
          } else {
              setPreviewSide('right');
          }

          // Vertical Logic
          // Space below the top of the card
          const spaceBelowTop = windowHeight - rect.top;
          
          // If not enough space below the element's top to fit the preview, 
          // align to the bottom of the element so it grows upwards.
          // Note: Tailwind 'bottom-0' aligns bottom of preview with bottom of parent.
          if (spaceBelowTop < ESTIMATED_HEIGHT) {
              setPreviewAlign('bottom');
          } else {
              setPreviewAlign('top');
          }

          setShowPreview(true);
      }
  };

  const imageUrl = imgError ? 'https://via.placeholder.com/400x533?text=No+Image' : listing.imageUrl;

  return (
    <div 
      ref={cardRef}
      className="group relative h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* Actual Card Content */}
      <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="aspect-[3/4] w-full overflow-hidden bg-gray-200 relative">
            <img 
                src={imageUrl} 
                alt={listing.title} 
                loading="lazy"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105" 
            />
            
            {/* Graded Badge */}
            {isGraded && listing.gradingCompany && listing.grade && (
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur border border-gray-200 shadow-sm px-2 py-1 rounded flex flex-col items-center leading-none z-10">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">{listing.gradingCompany}</span>
                    <span className="text-lg font-black text-primary-600">{listing.grade}</span>
                </div>
            )}

            {/* Status / Timer Badge */}
            <div className="absolute bottom-0 left-0 right-0">
                {statusBadge ? statusBadge : (targetDate ? (
                    <div className={`py-2 px-3 text-center backdrop-blur-md ${badgeColorClass}`}>
                        <Countdown 
                            targetDate={targetDate} 
                            label={timerLabel}
                            className="text-xs font-bold tracking-wider uppercase"
                            fallback={<span className="text-xs font-bold tracking-wider uppercase">Ended</span>}
                        />
                    </div>
                ) : null)}
            </div>
          </div>
          
          <div className="flex flex-col flex-1 p-4">
            <div className="flex-1">
              {/* Booster Name prominent for Breaks */}
              {isBreak && listing.boosterName && (
                  <div className="text-xs font-bold text-purple-600 mb-1 uppercase tracking-wide truncate">
                      {listing.boosterName}
                  </div>
              )}
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{listing.title}</h3>
              
              {isBreak && (
                 <div className="mb-2 mt-3">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-700">{listing.currentParticipants}/{listing.targetParticipants} Spots</span>
                        <span className="text-gray-500">{Math.round(breakPercent)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${isBreakFull ? 'bg-green-500' : 'bg-purple-600'}`} style={{width: `${breakPercent}%`}}></div>
                    </div>
                 </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{isAuction ? 'Current Bid' : (isBreak ? 'Entry' : 'Price')}</p>
                  <p className="text-lg font-bold text-gray-900">${isAuction ? listing.currentBid.toLocaleString() : listing.price.toLocaleString()}</p>
                  {isAuction && listing.reservePrice && listing.currentBid < listing.reservePrice && (
                      <span className="text-[10px] text-red-500 font-medium block">Reserve not met</span>
                  )}
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={handleMainAction}
                    // Owner always enabled. Others disabled if ended/full/sold.
                    disabled={!isOwner && ((isEnded && isAuction) || (isBreak && isBreakFull) || listing.isSold)}
                    className={`flex-1 flex items-center justify-center rounded-lg px-3 py-2 text-sm font-bold shadow-sm transition-colors
                        ${isOwner 
                            ? 'bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-100' // Distinct Seller Style
                            : (!isOwner && ((isEnded && isAuction) || (isBreak && isBreakFull) || listing.isSold)) 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                : 'bg-primary-600 text-white hover:bg-primary-700 border border-transparent'
                        }`}
                >
                    {isOwner ? (
                        <>
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            {getOwnerActionLabel()}
                        </>
                    ) : (
                        (isBreak ? (isBreakFull ? 'Full' : 'Join') : (isEnded || listing.isSold ? 'Closed' : actionLabel))
                    )}
                </button>
            </div>
            
            {/* Seller Trust Line */}
            <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="text-[10px] text-gray-400">Sold by</span>
                <span className="text-[10px] font-semibold text-gray-600 truncate max-w-[80px]">{listing.sellerName}</span>
                {listing.sellerVerified && (
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                )}
            </div>
          </div>
      </div>

      {/* Popover Preview */}
      {showPreview && enableHoverPreview && (
          <div 
            className={`hidden md:block absolute w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] p-5 pointer-events-none transition-all duration-200 
                ${previewSide === 'right' ? 'left-full ml-3' : 'right-full mr-3'} 
                ${previewAlign === 'top' ? 'top-0' : 'bottom-0'}
            `}
          >
              <h4 className="font-bold text-gray-900 leading-tight mb-1">{listing.title}</h4>
              <p className="text-xs text-gray-500 mb-3">{listing.setName} {listing.setId && `• ${listing.setId.toUpperCase()}`}</p>
              
              <div className="flex flex-wrap gap-1.5 mb-3">
                  {listing.condition && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">{listing.condition}</span>}
                  {listing.grade && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">Grade {listing.grade}</span>}
                  {listing.variantTags?.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100">
                          {TAG_DISPLAY_LABELS[tag] || tag}
                      </span>
                  ))}
              </div>

              <div className="text-xs text-gray-600 line-clamp-4 leading-relaxed mb-4">
                  {listing.description}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                      Seller Rating: <span className="font-bold text-gray-900">98%</span>
                  </div>
                  <div className="text-xs font-bold text-primary-600">
                      View Details &rarr;
                  </div>
              </div>
          </div>
      )}
    </div>
  );
});
