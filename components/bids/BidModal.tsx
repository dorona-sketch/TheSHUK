
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Listing, User, Bid } from '../../types';
import { Countdown } from '../Countdown';
import { parseDate, formatSmartDate } from '../../utils/dateUtils';

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
    bidHistory = [] 
}) => {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Safely calculate derived state
  const { currentBid, startPrice, minBid, parsedEndsAt } = useMemo(() => {
      if (!listing) return { currentBid: 0, startPrice: 0, minBid: 0, parsedEndsAt: null };
      
      const curr = listing.currentBid || 0;
      const start = listing.price || 0;
      // Min bid is current + 1 or start price
      const minimum = curr > 0 ? curr + 1 : start;
      
      return {
          currentBid: curr,
          startPrice: start,
          minBid: minimum,
          parsedEndsAt: parseDate(listing.endsAt)
      };
  }, [listing]);

  // Calculate dynamic increment buttons based on price point
  const quickIncrements = useMemo(() => {
      if (minBid < 50) return [1, 5, 10];
      if (minBid < 200) return [5, 10, 25];
      if (minBid < 1000) return [10, 25, 50];
      return [50, 100, 250];
  }, [minBid]);

  useEffect(() => {
    if (isOpen && listing) {
        // Reset state on open
        setBidAmount(minBid.toString());
        setError(null);
        setWarning(null);
        setIsSubmitting(false);
        setIsEnded(false);
        setShowSuccess(false);
        
        if (parsedEndsAt && new Date() > parsedEndsAt) {
            setIsEnded(true);
            setError("Auction has ended.");
        }

        // Auto-focus input
        const timer = setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isOpen, listing?.id, minBid, parsedEndsAt]);

  // Real-time Validation
  useEffect(() => {
      if (!isOpen || showSuccess) return;
      
      if (!bidAmount) {
          setError(null);
          setWarning(null);
          return;
      }

      const amount = parseFloat(bidAmount);

      if (isNaN(amount)) {
          setError("Please enter a valid number");
          return;
      }

      if (amount < minBid) {
          setError(`Minimum bid is $${minBid.toLocaleString()}`);
      } else {
          setError(null);
      }

      // Check balance
      if (currentUser && amount > currentUser.walletBalance) {
          setWarning(`Insufficient funds (Balance: $${currentUser.walletBalance.toLocaleString()})`);
      } else {
          setWarning(null);
      }
  }, [bidAmount, minBid, currentUser?.walletBalance, isOpen, showSuccess]);

  // Focus Trap & ESC Key Handler
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isOpen) return;
          
          if (e.key === 'Escape') {
              onClose();
              return;
          }

          // Focus Trap
          if (e.key === 'Tab' && modalRef.current) {
              const focusableElements = modalRef.current.querySelectorAll(
                  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
              );
              
              if (focusableElements.length === 0) return;

              const firstElement = focusableElements[0] as HTMLElement;
              const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

              if (e.shiftKey) { // Shift + Tab
                  if (document.activeElement === firstElement) {
                      e.preventDefault();
                      lastElement.focus();
                  }
              } else { // Tab
                  if (document.activeElement === lastElement) {
                      e.preventDefault();
                      firstElement.focus();
                  }
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (parsedEndsAt && new Date() > parsedEndsAt) {
          setError("Auction has ended.");
          setIsEnded(true);
          return;
      }
      
      const amount = parseFloat(bidAmount);
      if (isNaN(amount) || amount < minBid) {
          setError(`Invalid amount. Must be at least $${minBid}`);
          return;
      }

      setIsSubmitting(true);
      setError(null);
      
      try {
          // Simulate network delay for better UX feeling
          await new Promise(r => setTimeout(r, 500));
          
          const result = onPlaceBid(amount);
          if (!result.success) {
              setError(result.message);
              setIsSubmitting(false);
          } else {
              // Show success state
              setShowSuccess(true);
              setTimeout(() => {
                  onClose();
              }, 1500);
          }
      } catch (e: any) {
          console.error("Bid error:", e);
          setError("Failed to place bid. Please try again.");
          setIsSubmitting(false);
      }
  };

  const handleQuickIncrement = (inc: number) => {
      const currentVal = parseFloat(bidAmount);
      const base = isNaN(currentVal) ? minBid : currentVal;
      const newVal = Math.max(minBid, base + inc);
      setBidAmount(newVal.toString());
      inputRef.current?.focus();
  };

  const currentPriceDisplay = currentBid > 0 ? currentBid : startPrice;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="bid-modal-title">
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        {/* Backdrop */}
        <div 
            className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity" 
            onClick={onClose}
            aria-hidden="true"
        ></div>

        {/* Modal Panel */}
        <div 
            ref={modalRef}
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up transform transition-all scale-100 text-left overflow-hidden"
        >
            {showSuccess ? (
                <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce-short">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Bid Placed!</h3>
                    <p className="text-gray-500 font-medium">You are the highest bidder.</p>
                    <div className="mt-4 text-lg font-bold text-gray-900">
                        ${parseFloat(bidAmount).toLocaleString()}
                    </div>
                </div>
            ) : (
                <>
                    {/* Close Button */}
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        aria-label="Close modal"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="mb-6 text-center">
                        <h3 id="bid-modal-title" className="text-2xl font-extrabold text-gray-900 tracking-tight">Place Bid</h3>
                        <p className="text-gray-500 text-sm mt-1 truncate px-8">{listing.title}</p>
                    </div>

                    {/* Listing Summary Card */}
                    <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-center justify-between border border-gray-100 shadow-inner">
                        <div>
                            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Price</span>
                            <span className="font-mono font-black text-3xl text-gray-900 tracking-tight">${currentPriceDisplay.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Time Left</span>
                            <Countdown 
                                targetDate={parsedEndsAt} 
                                fallback={<span className="text-red-600 font-bold">Ended</span>} 
                                onComplete={() => setIsEnded(true)} 
                                className="font-bold text-amber-600 text-lg tabular-nums" 
                            />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="relative">
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="bid-amount" className="block text-xs font-bold text-gray-700 uppercase">Your Bid</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Suggested:</span>
                                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded border border-primary-100">
                                        ${minBid.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-2xl pointer-events-none">$</span>
                                <input 
                                    id="bid-amount"
                                    ref={inputRef}
                                    type="number" 
                                    value={bidAmount} 
                                    onChange={e => setBidAmount(e.target.value)} 
                                    className={`w-full pl-10 pr-4 py-4 rounded-xl border-2 font-bold text-3xl text-gray-900 outline-none transition-all placeholder-gray-300
                                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100'}
                                    `}
                                    step="1"
                                    min={minBid}
                                    disabled={isSubmitting || isEnded}
                                />
                            </div>
                            
                            {/* Error / Warning Messages */}
                            <div className="min-h-[24px] mt-2 text-sm">
                                {error ? (
                                    <p className="font-bold text-red-600 flex items-center gap-1 animate-pulse">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        {error}
                                    </p>
                                ) : warning ? (
                                    <p className="font-bold text-amber-600 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        {warning}
                                    </p>
                                ) : (
                                    <p className="text-gray-400 text-xs">Enter ${minBid.toLocaleString()} or more to bid</p>
                                )}
                            </div>
                        </div>

                        {/* Quick Increments */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {quickIncrements.map(inc => (
                                <button 
                                    type="button" 
                                    key={inc} 
                                    onClick={() => handleQuickIncrement(inc)} 
                                    disabled={isSubmitting || isEnded}
                                    className="py-3 bg-white border border-gray-200 hover:border-primary-400 hover:bg-primary-50 text-gray-700 hover:text-primary-700 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    +${inc}
                                </button>
                            ))}
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting || isEnded || !!error || !bidAmount}
                            className="w-full py-4 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-lg focus:outline-none focus:ring-4 focus:ring-gray-300"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing Bid...
                                </>
                            ) : (
                                isEnded ? 'Auction Ended' : `Confirm Bid • $${parseFloat(bidAmount || '0').toLocaleString()}`
                            )}
                        </button>
                    </form>

                    {/* Recent Bids Section */}
                    {bidHistory.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Activity</h4>
                            </div>
                            
                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                {bidHistory.slice(0, 5).map((bid) => {
                                    const isMe = bid.bidderId === currentUser.id;
                                    return (
                                        <div key={bid.id} className={`flex justify-between items-center px-4 py-2.5 rounded-lg text-sm border ${isMe ? 'bg-primary-50 border-primary-100' : 'bg-white border-gray-100'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${isMe ? 'bg-primary-500' : 'bg-gray-300'}`}></div>
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${isMe ? 'text-primary-900' : 'text-gray-900'}`}>
                                                        {isMe ? 'You' : bid.bidderName}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatSmartDate(bid.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`font-mono font-bold ${isMe ? 'text-primary-700' : 'text-gray-900'}`}>
                                                ${bid.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
