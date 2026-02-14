
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Listing, User, ListingType, Bid, BreakStatus, BreakEntryStatus, ProductCategory, TransactionType } from '../types';
import { useStore } from '../context/StoreContext';
import { ListingCard } from './ListingCard';
import { getLocationInfo } from '../services/geminiService';
import { fetchCardById } from '../services/tcgApiService';
import { Countdown } from './Countdown';
import { formatLocalTime, formatSmartDate } from '../utils/dateUtils';
import { TAG_DISPLAY_LABELS } from '../constants';

interface ListingDetailViewProps {
  listing: Listing;
  currentUser: User | null;
  onBack: () => void;
  onInteract: (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => void;
  onViewListing: (listing: Listing) => void;
  onWatchLive?: (listing: Listing) => void;
}

const ImageGallery: React.FC<{ listing: Listing }> = ({ listing }) => {
  const [activeImg, setActiveImg] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const images = useMemo(() => {
      const imgs = [listing.imageUrl || 'https://via.placeholder.com/400x600?text=No+Image'];
      if (listing.breakContentImages && listing.breakContentImages.length > 0) {
          imgs.push(...listing.breakContentImages);
      }
      return imgs;
  }, [listing]);

  useEffect(() => setActiveImg(0), [listing.id]);

  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      <div 
        className="relative aspect-[3/4] w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm cursor-zoom-in group"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <img 
            src={images[activeImg]} 
            alt={listing.title} 
            className={`w-full h-full object-contain transition-transform duration-700 ease-in-out ${isZoomed ? 'scale-150' : 'scale-100'}`} 
        />
        {listing.type === ListingType.TIMED_BREAK && (
             <div className={`absolute top-4 left-4 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md
                ${listing.breakStatus === BreakStatus.LIVE ? 'bg-red-600 animate-pulse' : (listing.breakStatus === BreakStatus.EXPIRED ? 'bg-gray-500' : (listing.breakStatus === BreakStatus.CANCELLED ? 'bg-red-700' : 'bg-purple-600'))}`}>
                 {listing.breakStatus === BreakStatus.LIVE ? 'LIVE NOW' : (listing.breakStatus === BreakStatus.EXPIRED ? 'EXPIRED' : (listing.breakStatus === BreakStatus.COMPLETED ? 'COMPLETED' : (listing.breakStatus === BreakStatus.CANCELLED ? 'CANCELLED' : (listing.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE ? 'SOLD OUT' : 'Timed Break'))))}
             </div>
        )}
      </div>
      {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImg(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${activeImg === idx ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                  >
                      <img src={img} className="w-full h-full object-cover" alt={`View ${idx}`} />
                  </button>
              ))}
          </div>
      )}
    </div>
  );
};

const BreakInfoPanel: React.FC<{ listing: Listing }> = ({ listing }) => {
    if (listing.type !== ListingType.TIMED_BREAK) return null;

    const productName = listing.openedProduct?.productName || listing.boosterName || "Mystery Product";

    return (
        <div className="mt-6 space-y-6">
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    What's in the Break?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                        <div className="text-xs text-purple-500 font-bold uppercase mb-1">Guaranteed</div>
                        <div className="text-sm font-medium text-gray-900">{listing.minPrizeDesc || "Standard pack contents"}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                        <div className="text-xs text-purple-500 font-bold uppercase mb-1">Product</div>
                        <div className="text-sm font-medium text-gray-900">{productName}</div>
                    </div>
                    {listing.preferredLiveWindow && (
                        <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm md:col-span-2">
                            <div className="text-xs text-purple-500 font-bold uppercase mb-1">Live Schedule</div>
                            <div className="text-sm font-medium text-gray-900">{listing.preferredLiveWindow}</div>
                        </div>
                    )}
                    {listing.liveLink && (
                        <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm md:col-span-2 flex items-center gap-2">
                            <span className="text-xs text-purple-500 font-bold uppercase">Platform:</span>
                            <a href={listing.liveLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-purple-700 hover:underline truncate">
                                {listing.liveLink}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {listing.additionalPrizes && listing.additionalPrizes.length > 0 && (
                <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
                        <span className="text-lg">🏆</span> Additional Prizes
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        {listing.additionalPrizes.map((prize, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden shrink-0 border border-gray-200">
                                    {prize.imageUrl ? (
                                        <img src={prize.imageUrl} className="w-full h-full object-cover" alt={prize.title} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">?</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-gray-900 truncate">{prize.title}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">{prize.howToWin}</span>
                                        <span>Qty: {prize.quantity}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ParticipantsList: React.FC<{ listing: Listing, isOwner: boolean, currentUserId?: string }> = ({ listing, isOwner, currentUserId }) => {
    const { getBreakEntries, removeBreakEntry } = useStore();
    if (!listing?.id) return null;
    
    const entries = getBreakEntries(listing.id) || [];
    
    if (listing.type !== ListingType.TIMED_BREAK) return null;

    const handleRemove = async (entryId: string, isSelf: boolean) => {
        if(confirm(isSelf ? "Leave this break? You will lose your spot." : "Remove this participant? This will open a spot.")) {
            const res = await removeBreakEntry(entryId);
            if (!res.success) alert(res.message);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-6">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Participants</h3>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                    {entries.length} / {listing.targetParticipants || 0} Joined
                </span>
            </div>
            <div className="max-h-60 overflow-y-auto">
                {entries.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">Be the first to join!</div> : (
                    <div className="divide-y divide-gray-100">
                        {entries.map((entry) => {
                            const isMe = currentUserId === entry.userId;
                            const canRemove = isOwner || (isMe && listing.breakStatus !== BreakStatus.LIVE && listing.breakStatus !== BreakStatus.COMPLETED && listing.breakStatus !== BreakStatus.CANCELLED);
                            
                            return (
                                <div key={entry.id} className="px-5 py-3 flex items-center justify-between gap-3 group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img 
                                            src={entry.userAvatar || `https://ui-avatars.com/api/?name=${entry.userName}`} 
                                            className="w-8 h-8 rounded-full border border-gray-200"
                                            alt={entry.userName}
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                {entry.userName} {isMe && <span className="text-xs text-gray-400">(You)</span>}
                                            </div>
                                            <div className="text-xs text-gray-500">{formatSmartDate(entry.joinedAt)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {entry.status === BreakEntryStatus.CHARGED && (
                                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">CONFIRMED</span>
                                        )}
                                        {entry.status === BreakEntryStatus.AUTHORIZED && (
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">AUTHORIZED</span>
                                        )}
                                        {entry.status === BreakEntryStatus.CANCELLED && (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">REFUNDED</span>
                                        )}
                                        {canRemove && entry.status !== BreakEntryStatus.CANCELLED && (
                                            <button 
                                                onClick={() => handleRemove(entry.id, isMe)}
                                                className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title={isMe ? "Leave Break" : "Remove Participant"}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const BidHistory: React.FC<{ bids: Bid[], listing: Listing }> = ({ bids, listing }) => {
    if (listing.type !== ListingType.AUCTION) return null;
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Bid History</h3>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{bids.length} Bids</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
                {bids.length === 0 ? <div className="p-8 text-center text-gray-500">No bids yet.</div> : (
                    <table className="min-w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                            {bids.map((bid, idx) => (
                                <tr key={bid.id} className={idx === 0 ? 'bg-green-50/50' : 'hover:bg-gray-50'}>
                                    <td className="px-5 py-3 font-medium text-gray-900">{bid.bidderName}</td>
                                    <td className="px-5 py-3 text-right font-bold text-gray-900">${bid.amount.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right text-gray-500 text-xs">{formatSmartDate(bid.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const LocationGrounding: React.FC<{ location: string }> = ({ location }) => {
    const [info, setInfo] = useState<{text: string, mapLinks: any[]} | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchInfo = async () => {
        setLoading(true);
        const data = await getLocationInfo(location);
        setInfo(data);
        setLoading(false);
    };

    if (!location) return null;

    return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                Ships from {location}
            </h4>
            {!info && !loading && (
                <button onClick={fetchInfo} className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    Verify Location Info
                </button>
            )}
            {loading && <span className="text-xs text-gray-400">Fetching map data...</span>}
            {info && (
                <div className="text-sm text-gray-600 space-y-2 mt-2">
                    <p className="italic border-l-2 border-blue-200 pl-2">{info.text}</p>
                    {info.mapLinks && info.mapLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {info.mapLinks.map((link, i) => (
                                <a 
                                    key={i} 
                                    href={link.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center text-xs bg-white border border-gray-200 rounded-full px-2 py-1 text-blue-600 hover:bg-blue-50"
                                >
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                                    {link.title}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ReportIssueModal: React.FC<{ isOpen: boolean, onClose: () => void, onSubmit: (reason: string) => void }> = ({ isOpen, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Report Issue</h3>
                <p className="text-sm text-gray-500 mb-4">Please describe the issue with this break result (e.g., missing items, incorrect winner).</p>
                <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    rows={4}
                    placeholder="Describe the issue..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                />
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={onClose} className="text-gray-600 font-medium text-sm hover:bg-gray-100 px-4 py-2 rounded-lg">Cancel</button>
                    <button
                        onClick={() => { onSubmit(reason); onClose(); setReason(''); }}
                        disabled={!reason.trim()}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                        Submit Report
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResultsTab: React.FC<{ 
    listing: Listing, 
    isOwner: boolean, 
    onComplete: (media: string[], notes: string) => void 
}> = ({ listing, isOwner, onComplete }) => {
    const { submitReport } = useStore();
    const [notes, setNotes] = useState('');
    const [media, setMedia] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    
    // 1. Completed View (Public/Buyer)
    if (listing.breakStatus === BreakStatus.COMPLETED) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                    <h3 className="font-bold text-green-900 mb-3 text-lg flex items-center gap-2">
                        <span className="text-xl">✅</span> Break Results
                    </h3>
                    {listing.resultsNotes ? (
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{listing.resultsNotes}</p>
                    ) : (
                        <p className="text-gray-500 italic">No recap notes provided.</p>
                    )}
                </div>

                {listing.resultsMedia && listing.resultsMedia.length > 0 && (
                    <div>
                        <h4 className="font-bold text-gray-900 mb-3">Hits & Highlights</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {listing.resultsMedia.map((m, i) => (
                                <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative">
                                    <img src={m} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`Result ${i + 1}`} />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Report for Buyers */}
                {!isOwner && (
                    <div className="pt-6 border-t border-gray-100">
                        <button 
                            onClick={() => setShowReportModal(true)}
                            className="text-xs text-red-500 font-bold hover:text-red-700 flex items-center gap-1 hover:underline"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Report Issue with Result
                        </button>
                        <ReportIssueModal 
                            isOpen={showReportModal} 
                            onClose={() => setShowReportModal(false)}
                            onSubmit={(reason) => {
                                submitReport(listing.id, 'LISTING', reason);
                                alert("Report submitted to moderation team.");
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }

    // 2. Live Host View (Form)
    if (isOwner && listing.breakStatus === BreakStatus.LIVE) {
        return (
            <div className="bg-white p-6 rounded-xl border-2 border-indigo-100 shadow-sm animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-indigo-50">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Finalize Break</h3>
                        <p className="text-sm text-gray-500">Document hits and close the session.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Recap Notes</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" 
                            rows={4} 
                            placeholder="Summarize the top pulls, mention the wheel winner, etc."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Upload Hit Photos</label>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <p className="text-sm text-gray-500 font-medium">Click to upload photos</p>
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                                </div>
                                <input type="file" className="hidden" multiple accept="image/*" onChange={(e) => {
                                    if(e.target.files) {
                                        Array.from(e.target.files).forEach((f) => {
                                            const r = new FileReader();
                                            r.onloadend = () => setMedia(prev => [...prev, r.result as string]);
                                            r.readAsDataURL(f as Blob);
                                        });
                                    }
                                }} />
                            </label>
                        </div>
                        
                        {/* Preview Grid */}
                        {media.length > 0 && (
                            <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-thin">
                                {media.map((m, i) => (
                                    <div key={i} className="relative w-20 h-20 shrink-0 group">
                                        <img src={m} className="h-full w-full object-cover rounded-lg border border-gray-200" />
                                        <button 
                                            onClick={() => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => {
                                if(confirm("Are you sure you want to end the break? This will charge all participants and mark the listing as completed.")) {
                                    setIsSubmitting(true);
                                    onComplete(media, notes);
                                }
                            }}
                            disabled={isSubmitting}
                            className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Processing...
                                </>
                            ) : (
                                'Complete Break & Capture Payments'
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-3">
                            This action is irreversible. Funds will be released to your wallet.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Waiting State
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 text-3xl shadow-sm border border-gray-100">
                📊
            </div>
            <h3 className="text-gray-900 font-bold mb-1">Results Pending</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
                Break results, photos, and recap notes will be posted here by the host after the stream concludes.
            </p>
        </div>
    );
};

export const ListingDetailView: React.FC<ListingDetailViewProps> = ({ 
    listing, 
    currentUser, 
    onBack, 
    onInteract, 
    onViewListing, 
    onWatchLive 
}) => {
    if (!listing) return <div className="p-8 text-center text-gray-500">Listing not available</div>;

    const { getBidsByListingId, getRelatedListings, scheduleBreak, startBreak, completeBreak, cancelBreak, joinWaitlist, getBreakEntries, getWaitlistPosition } = useStore();
    
    // ... existing logic ...
    const bids = useMemo(() => getBidsByListingId(listing.id) || [], [listing.id, getBidsByListingId]);
    const related = useMemo(() => getRelatedListings(listing) || [], [listing, getRelatedListings]);
    
    const [scheduleDate, setScheduleDate] = useState<string>('');
    const [streamLink, setStreamLink] = useState<string>('https://twitch.tv/pokevault_official');
    const [isScheduling, setIsScheduling] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [apiCard, setApiCard] = useState<any>(null);

    const breakEntries = useMemo(() => getBreakEntries(listing.id) || [], [listing.id, getBreakEntries]);
    const userEntriesCount = breakEntries.filter(e => e.userId === currentUser?.id).length;
    const maxEntries = listing.maxEntriesPerUser || 999;
    const isEntryLimitReached = userEntriesCount >= maxEntries;
    
    const isFull = (listing.currentParticipants || 0) >= (listing.targetParticipants || 0);
    const waitlistPos = getWaitlistPosition(listing.id);

    useEffect(() => {
        const loadApiData = async () => {
            if (listing.tcgCardId) {
                const data = await fetchCardById(listing.tcgCardId);
                if (data) setApiCard(data);
            }
        };
        loadApiData();
    }, [listing.tcgCardId]);

    const isOwner = currentUser?.id === listing.sellerId;
    const isAuction = listing.type === ListingType.AUCTION;
    const isBreak = listing.type === ListingType.TIMED_BREAK;
    const isEnded = listing.isSold || (isBreak && (listing.breakStatus === BreakStatus.COMPLETED || listing.breakStatus === BreakStatus.CANCELLED));

    let targetDate: Date | undefined;
    let timerLabel = '';
    
    if (isAuction) {
        targetDate = listing.endsAt;
        timerLabel = 'Ends in';
    } else if (isBreak) {
        if (listing.breakStatus === BreakStatus.SCHEDULED) {
            targetDate = listing.scheduledLiveAt;
            timerLabel = 'Live in';
        } else if (listing.breakStatus === BreakStatus.OPEN) {
            targetDate = listing.closesAt;
            timerLabel = 'Closes in';
        }
    }

    const handleSchedule = () => {
        if (!scheduleDate) return alert("Pick a date");
        const date = new Date(scheduleDate);
        if (isNaN(date.getTime())) return alert("Invalid date");
        if (date < new Date()) return alert("Schedule date must be in the future.");
        
        setIsScheduling(true);
        setTimeout(() => {
            const res = scheduleBreak(listing.id, date, streamLink);
            setIsScheduling(false);
            if (!res.success) alert(res.message);
        }, 500);
    };

    const handleInteractWrapper = async (action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => {
        if (action === 'BUY' && isBreak) {
            setIsJoining(true);
            try {
                await onInteract(listing, action);
            } finally {
                setIsJoining(false);
            }
        } else {
            onInteract(listing, action);
        }
    };

    const handleWaitlist = async () => {
        if (!currentUser) return alert("Please sign in.");
        const res = await joinWaitlist(listing.id);
        alert(res.message);
    };

    const renderBreakAction = () => {
        if (!isOwner) {
            if (listing.breakStatus === BreakStatus.LIVE) {
                return (
                    <button onClick={() => onWatchLive && onWatchLive(listing)} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg animate-pulse flex items-center justify-center gap-2">
                        <span className="w-3 h-3 bg-white rounded-full"></span> WATCH LIVE
                    </button>
                );
            }
            if (isFull || listing.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE) {
                return (
                    <div className="space-y-3">
                        <div className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-xl text-center flex flex-col justify-center items-center border border-gray-200">
                            <span>Sold Out</span>
                            {waitlistPos > -1 && <span className="text-xs text-blue-600 font-medium">You are #{waitlistPos} on waitlist</span>}
                        </div>
                        {waitlistPos === -1 && (
                            <button 
                                onClick={handleWaitlist}
                                className="w-full py-3 border-2 border-blue-100 text-blue-600 font-bold rounded-xl hover:bg-blue-50 text-sm transition-colors"
                            >
                                Join Waitlist
                            </button>
                        )}
                        {listing.breakStatus === BreakStatus.SCHEDULED && (
                             <div className="text-sm text-center text-purple-700 bg-purple-50 p-2 rounded-lg font-bold mt-1 border border-purple-100">
                                 📅 Stream Scheduled: <br/>{formatSmartDate(listing.scheduledLiveAt)}
                             </div>
                        )}
                    </div>
                );
            }
            if (listing.breakStatus === BreakStatus.OPEN) {
                if (isEntryLimitReached) {
                    return (
                        <button 
                            disabled
                            className="w-full py-4 bg-gray-200 text-gray-500 font-bold rounded-xl cursor-not-allowed border border-gray-300"
                        >
                            Max Entries Reached ({userEntriesCount}/{maxEntries})
                        </button>
                    );
                }

                return (
                    <button 
                        onClick={() => handleInteractWrapper('BUY')} 
                        disabled={isJoining}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 disabled:transform-none disabled:cursor-not-allowed border border-purple-800"
                    >
                        {isJoining ? 'Securing Spot...' : `Join Break • $${listing.price}`}
                    </button>
                );
            }
            return <div className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-xl text-center">Break Ended</div>;
        } else {
            if (listing.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE) {
                return (
                    <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4 animate-fade-in-up">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold">
                            <span className="text-xl">📅</span>
                            <h4>Break Full! Schedule Stream</h4>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-indigo-800 font-bold mb-1 uppercase">Start Time</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-indigo-800 font-bold mb-1 uppercase">Stream Link</label>
                                <input 
                                    type="text"
                                    value={streamLink}
                                    onChange={(e) => setStreamLink(e.target.value)}
                                    className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="https://twitch.tv/..."
                                />
                            </div>
                            <button 
                                onClick={handleSchedule} 
                                disabled={isScheduling}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md active:scale-95 disabled:opacity-70"
                            >
                                {isScheduling ? 'Scheduling...' : 'Confirm Schedule & Notify'}
                            </button>
                        </div>
                    </div>
                );
            }
            if (listing.breakStatus === BreakStatus.SCHEDULED) {
                return (
                    <div className="space-y-3">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                            <span className="block text-xs font-bold text-green-800 uppercase mb-1">Scheduled For</span>
                            <span className="font-bold text-green-900 text-lg">{formatSmartDate(listing.scheduledLiveAt)}</span>
                        </div>
                        <button onClick={() => { startBreak(listing.id); if(onWatchLive) onWatchLive(listing); }} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg border border-green-800 transform transition-transform active:scale-95">
                            Start Stream & Go Live 🔴
                        </button>
                    </div>
                );
            }
            if (listing.breakStatus === BreakStatus.LIVE) {
                return (
                    <button onClick={() => onWatchLive && onWatchLive(listing)} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg animate-pulse border border-red-800">
                        Enter Host Console 🎙️
                    </button>
                );
            }
            if (listing.breakStatus === BreakStatus.OPEN) {
                 return (
                    <button onClick={() => onInteract(listing, 'MANAGE')} className="w-full py-4 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl shadow-lg">
                        Edit Listing Details
                    </button>
                );
            }
            return null;
        }
    };

    return (
        <div className="animate-fade-in-up pb-12">
            <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
                &larr; Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <ImageGallery listing={listing} />
                    
                    <div className="hidden lg:block bg-white p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
                        {listing.variantTags && listing.variantTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                                {listing.variantTags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded border border-gray-200">
                                        {TAG_DISPLAY_LABELS[tag] || tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        {listing.sellerLocation && <LocationGrounding location={listing.sellerLocation} />}
                        
                        {apiCard && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Card Details</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="block text-gray-500 text-xs">Artist</span>
                                        <span className="font-medium">{apiCard.artist || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs">Rarity</span>
                                        <span className="font-medium">{apiCard.rarity || 'Unknown'}</span>
                                    </div>
                                    {apiCard.flavorText && (
                                        <div className="col-span-2 mt-2">
                                            <span className="block text-gray-500 text-xs">Flavor Text</span>
                                            <p className="italic text-gray-600 mt-1">"{apiCard.flavorText}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <BreakInfoPanel listing={listing} />
                    <ResultsTab listing={listing} isOwner={isOwner} onComplete={(m, n) => completeBreak(listing.id, m, n)} />
                </div>

                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-24">
                        {/* ... Sidebar Content ... */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{listing.title}</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    {listing.setName} {listing.setId && `• #${listing.setId}`}
                                </p>
                            </div>
                            {isOwner && (
                                <button 
                                    onClick={() => onInteract(listing, 'MANAGE')}
                                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                    title="Edit Listing"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                            )}
                        </div>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-gray-900">
                                    ${isAuction ? (listing.currentBid || listing.price).toLocaleString() : listing.price.toLocaleString()}
                                </span>
                                {isBreak && <span className="text-sm text-gray-500 font-medium">per spot</span>}
                            </div>
                            
                            {targetDate && !isEnded && (
                                <div className="mt-2 flex items-center gap-2 text-red-600 bg-red-50 w-fit px-3 py-1 rounded-lg">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <Countdown targetDate={targetDate} label={timerLabel} className="text-sm font-bold" />
                                </div>
                            )}
                            {targetDate && !isEnded && (
                                <div className="mt-1 text-xs text-gray-400 font-medium pl-1">
                                    {formatLocalTime(targetDate)}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {isBreak ? renderBreakAction() : (
                                !isEnded ? (
                                    <button 
                                        onClick={() => isOwner ? onInteract(listing, 'MANAGE') : onInteract(listing, isAuction ? 'BID' : 'BUY')}
                                        className={`w-full py-4 rounded-xl shadow-lg font-bold text-white transition-all transform hover:-translate-y-1 ${
                                            isOwner 
                                            ? 'bg-gray-800 hover:bg-gray-900' 
                                            : (isAuction ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700')
                                        }`}
                                    >
                                        {isOwner ? 'Edit Listing Details' : (isAuction ? 'Place Bid' : 'Buy Now')}
                                    </button>
                                ) : (
                                    <div className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-xl text-center uppercase tracking-wide">
                                        {listing.isSold ? 'Sold' : 'Ended'}
                                    </div>
                                )
                            )}

                            {!isOwner && !isEnded && (
                                <button 
                                    onClick={() => onInteract(listing, 'CHAT')}
                                    className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Message Seller
                                </button>
                            )}
                            
                            {isOwner && isBreak && listing.breakStatus !== BreakStatus.COMPLETED && listing.breakStatus !== BreakStatus.CANCELLED && (
                                <button 
                                    onClick={() => { if(confirm('Cancel this break?')) cancelBreak(listing.id); }}
                                    className="w-full py-2 text-xs text-red-500 hover:text-red-700 hover:underline"
                                >
                                    Cancel Break
                                </button>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <span className="block font-bold text-gray-900">Auth Guarantee</span>
                                    Verified authenticity
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <span className="block font-bold text-gray-900">Fast Shipping</span>
                                    Ships within 24h
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:hidden bg-white p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
                        {listing.sellerLocation && <LocationGrounding location={listing.sellerLocation} />}
                        {apiCard && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Card Details</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="block text-gray-500 text-xs">Artist</span>
                                        <span className="font-medium">{apiCard.artist || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs">Rarity</span>
                                        <span className="font-medium">{apiCard.rarity || 'Unknown'}</span>
                                    </div>
                                    {apiCard.flavorText && (
                                        <div className="col-span-2 mt-2">
                                            <span className="block text-gray-500 text-xs">Flavor Text</span>
                                            <p className="italic text-gray-600 mt-1">"{apiCard.flavorText}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {isAuction && <BidHistory bids={bids} listing={listing} />}
                    {isBreak && <ParticipantsList listing={listing} isOwner={isOwner} currentUserId={currentUser?.id} />}
                </div>
            </div>

            {related.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {related.map(item => (
                            <div key={item.id} onClick={() => onViewListing(item)} className="cursor-pointer">
                                <ListingCard 
                                    listing={item} 
                                    onInteract={onInteract} 
                                    actionLabel="View" 
                                    currentUserId={currentUser?.id}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
