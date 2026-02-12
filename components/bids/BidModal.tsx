
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
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentBid, startPrice, minBid, parsedEndsAt } = useMemo(() => {
      const curr = listing?.currentBid || 0;
      const start = listing?.price || 0;
      return {
          currentBid: curr,
          startPrice: start,
          minBid: curr > 0 ? curr + 1 : start,
          parsedEndsAt: listing ? parseDate(listing.endsAt) : null
      };
  }, [listing]);

  useEffect(() => {
    if (isOpen && listing) {
        // Only set default if empty
        if (!bidAmount) setBidAmount(minBid.toString());
        
        setError(null);
        setWarning(null);
        setIsSubmitting(false);
        setIsEnded(false);
        
        if (parsedEndsAt && new Date() > parsedEndsAt) {
            setIsEnded(true);
        }

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
      if (!isOpen) return;
      const amount = parseFloat(bidAmount);
      
      if (!bidAmount) {
          setError(null);
          setWarning(null);
          return;
      }

      if (isNaN(amount)) {
          setError("Please enter a valid number");
          return;
      }

      if (amount < minBid) {
          setError(`Minimum bid is $${minBid.toLocaleString()}`);
      } else {
          setError(null);
      }

      if (amount > currentUser.walletBalance) {
          setWarning(`Low balance ($${currentUser.walletBalance.toLocaleString()}). Deposit required.`);
      } else {
          setWarning(null);
      }
  }, [bidAmount, minBid, currentUser.walletBalance, isOpen]);

  // ESC Key Handler
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (isOpen && e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (error) return; // Prevent if already invalid
      if (parsedEndsAt && new Date() > parsedEndsAt) {
          setError("Auction has ended.");
          setIsEnded(true);
          return;
      }
      
      const amount = parseFloat(bidAmount);
      if (isNaN(amount)) {
          setError("Invalid amount.");
          return;
      }

      setIsSubmitting(true);
      
      // Mimic network request
      setTimeout(() => {
          try {
              const result = onPlaceBid(amount);
              if (!result.success) {
                  setError(result.message);
                  setIsSubmitting(false);
              } else {
                  onClose();
                  setBidAmount(''); // Reset for next time
              }
          } catch (e: any) {
              console.error("Bid error:", e);
              setError("Failed to place bid.");
              setIsSubmitting(false);
          }
      }, 600);
  };

  const handleQuickIncrement = (inc: number) => {
      const currentVal = parseFloat(bidAmount) || (currentBid || startPrice);
      const newVal = Math.max(minBid, currentVal + inc);
      setBidAmount(newVal.toString());
  };

  const currentPriceDisplay = currentBid > 0 ? currentBid : startPrice;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up transform transition-all scale-100">
            {/* Close Button */}
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
                aria-label="Close modal"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="mb-6 text-center">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Place Bid</h3>
                <p className="text-gray-500 text-sm mt-1">{listing.title}</p>
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
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex justify-between">
                        <span>Your Bid</span>
                        <span className="text-primary-600">Min: ${minBid.toLocaleString()}</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-2xl">$</span>
                        <input 
                            ref={inputRef}
                            type="number" 
                            value={bidAmount} 
                            onChange={e => setBidAmount(e.target.value)} 
                            className={`w-full pl-10 pr-4 py-4 rounded-xl border-2 focus:ring-4 focus:ring-primary-100 font-bold text-3xl text-gray-900 outline-none transition-all
                                ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-primary-500'}
                            `}
                            step="1"
                            placeholder={minBid.toString()}
                            disabled={isSubmitting || isEnded}
                        />
                    </div>
                    
                    {/* Error / Warning Messages */}
                    <div className="h-6 mt-2">
                        {error ? (
                            <p className="text-xs font-bold text-red-600 flex items-center gap-1 animate-pulse">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {error}
                            </p>
                        ) : warning ? (
                            <p className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {warning}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                    {[5, 10, 25].map(inc => (
                        <button 
                            type="button" 
                            key={inc} 
                            onClick={() => handleQuickIncrement(inc)} 
                            disabled={isSubmitting || isEnded}
                            className="py-3 bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-700 hover:text-primary-700 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                        >
                            +${inc}
                        </button>
                    ))}
                </div>

                <button 
                    type="submit" 
                    disabled={isSubmitting || isEnded || !!error}
                    className="w-full py-4 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
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
        </div>
      </div>
    </div>
  );
};
