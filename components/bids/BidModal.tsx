
import React, { useState, useEffect, useRef } from 'react';
import { Listing, User, Bid } from '../../types';
import { Countdown } from '../Countdown';
import { parseDate } from '../../utils/dateUtils';

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  currentUser: User;
  onPlaceBid: (amount: number) => { success: boolean; message: string };
  bidHistory: Bid[];
}

export const BidModal: React.FC<BidModalProps> = ({ 
    isOpen, 
    onClose, 
    listing, 
    currentUser, 
    onPlaceBid,
    bidHistory 
}) => {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate prices safely
  const currentBid = listing?.currentBid || 0;
  const startPrice = listing?.price || 0;
  
  // Rule: If bids exist, next bid must be > current. If no bids, >= startPrice.
  // We set a suggestion of +$1 or startPrice.
  const minBid = currentBid > 0 ? currentBid + 1 : startPrice;
  const currentPriceDisplay = currentBid > 0 ? currentBid : startPrice;

  // Safe date parsing
  const parsedEndsAt = listing ? parseDate(listing.endsAt) : null;

  // Init effect - Reset state when modal opens or listing changes
  useEffect(() => {
    if (isOpen && listing) {
        setBidAmount(minBid.toString());
        setError(null);
        setIsSubmitting(false);
        setIsEnded(false);
        
        // Check if already ended
        if (parsedEndsAt && new Date() > parsedEndsAt) {
            setIsEnded(true);
        }

        // Focus input
        const timer = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }
  }, [isOpen, listing?.id, minBid, parsedEndsAt]);

  // If not open or no listing, render nothing
  if (!isOpen || !listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Final check on end time
      if (parsedEndsAt && new Date() > parsedEndsAt) {
          setError("Auction has ended.");
          setIsEnded(true);
          return;
      }
      
      const amount = parseFloat(bidAmount);
      if (isNaN(amount)) return setError("Invalid amount.");
      
      // Validation Logic matching StoreContext
      if (currentBid > 0) {
          if (amount <= currentBid) return setError(`Bid must be > $${currentBid.toLocaleString()}`);
      } else {
          if (amount < startPrice) return setError(`Bid must be >= $${startPrice.toLocaleString()}`);
      }

      setIsSubmitting(true);
      
      // Simulate network latency/processing for realism
      setTimeout(() => {
          try {
              const result = onPlaceBid(amount);
              if (!result.success) {
                  setError(result.message);
                  setIsSubmitting(false);
              } else {
                  // Success - close modal
                  onClose();
              }
          } catch (e: any) {
              console.error("Bid submission error:", e);
              setError(e.message || "Failed to submit bid.");
              setIsSubmitting(false);
          }
      }, 600);
  };

  const handleQuickIncrement = (inc: number) => {
      const currentVal = parseFloat(bidAmount) || minBid;
      setBidAmount((currentVal + inc).toString());
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm" onClick={onClose}></div>

        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-extrabold text-gray-900">Place Your Bid</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Listing Summary */}
            <div className="bg-gray-50 p-4 rounded-xl mb-6 flex gap-4 border border-gray-100">
                <img 
                    src={listing.imageUrl} 
                    alt={listing.title} 
                    className="w-16 h-20 object-cover rounded-lg border border-gray-200 bg-white" 
                />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 line-clamp-2">{listing.title}</div>
                    <div className="mt-2 text-xs flex gap-4">
                        <div>
                            <span className="text-gray-500 block uppercase tracking-wider text-[10px] font-bold">Current Price</span>
                            <span className="font-mono font-bold text-gray-900 text-lg">${currentPriceDisplay.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block uppercase tracking-wider text-[10px] font-bold">Time Left</span>
                            <Countdown 
                                targetDate={parsedEndsAt} 
                                fallback={<span className="text-red-600 font-bold">Ended</span>} 
                                onComplete={() => setIsEnded(true)} 
                                className="font-bold text-amber-600 text-sm" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200 flex items-center gap-2 animate-bounce-short">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Maximum Bid Amount</label>
                <div className="relative mb-4">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">$</span>
                    <input 
                        ref={inputRef}
                        type="number" 
                        value={bidAmount} 
                        onChange={e => setBidAmount(e.target.value)} 
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-bold text-xl text-gray-900 outline-none transition-shadow"
                        step="1"
                        min={minBid}
                        placeholder={minBid.toString()}
                        disabled={isSubmitting || isEnded}
                    />
                </div>

                <div className="grid grid-cols-4 gap-2 mb-6">
                    {[1, 5, 10, 20].map(inc => (
                        <button 
                            type="button" 
                            key={inc} 
                            onClick={() => handleQuickIncrement(inc)} 
                            disabled={isSubmitting || isEnded}
                            className="py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg text-sm font-bold text-gray-700 transition-colors disabled:opacity-50"
                        >
                            +${inc}
                        </button>
                    ))}
                </div>

                <button 
                    type="submit" 
                    disabled={isSubmitting || isEnded}
                    className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : (
                        isEnded ? 'Auction Ended' : 'Confirm Bid'
                    )}
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">
                    By placing a bid, you agree to the marketplace terms.
                </p>
            </form>
        </div>
      </div>
    </div>
  );
};
