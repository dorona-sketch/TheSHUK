
import React, { useMemo, useState } from 'react';
import { Listing, WalletTransaction, BreakEntry, ListingType, TransactionType } from '../../types';
import { formatSmartDate } from '../../utils/dateUtils';

interface ProfileTabsProps {
    transactions: WalletTransaction[];
    listings: Listing[];
    breaks: BreakEntry[];
    userId: string;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({ transactions, listings, breaks, userId }) => {
    const [activeTab, setActiveTab] = useState<'ACTIVITY' | 'LISTINGS' | 'BREAKS'>('ACTIVITY');

    // Filter Logic
    const myActivity = useMemo(() =>
        [...transactions]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10),
        [transactions]
    ); // Last 10
    const myListings = listings.filter(l => l.sellerId === userId && l.type !== ListingType.TIMED_BREAK);
    
    // For breaks, we combine hosted breaks (from listings) and joined breaks
    const myHostedBreaks = listings.filter(l => l.sellerId === userId && l.type === ListingType.TIMED_BREAK);
    const listingById = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
    // Unique breaks joined
    const myJoinedBreaks = breaks.map(b => b.listingId).filter((v, i, a) => a.indexOf(v) === i);

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[300px]">
            {/* Tab Header */}
            <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('ACTIVITY')}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'ACTIVITY' ? 'border-primary-600 text-primary-600 bg-primary-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Activity
                </button>
                <button 
                    onClick={() => setActiveTab('LISTINGS')}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'LISTINGS' ? 'border-primary-600 text-primary-600 bg-primary-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Listings ({myListings.length})
                </button>
                <button 
                    onClick={() => setActiveTab('BREAKS')}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'BREAKS' ? 'border-primary-600 text-primary-600 bg-primary-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Breaks
                </button>
            </div>

            {/* Content */}
            <div className="p-0">
                {activeTab === 'ACTIVITY' && (
                    <div className="divide-y divide-gray-100">
                        {myActivity.length === 0 ? (
                            <EmptyState icon="⚡️" message="No recent activity" />
                        ) : (
                            myActivity.map(tx => (
                                <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">{tx.description}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{formatSmartDate(tx.createdAt)}</div>
                                    </div>
                                    <span className={`text-sm font-bold ${tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.RELEASE ? 'text-green-600' : 'text-gray-900'}`}>
                                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'LISTINGS' && (
                    <div className="divide-y divide-gray-100">
                        {myListings.length === 0 ? (
                            <EmptyState icon="📦" message="No active listings" />
                        ) : (
                            myListings.map(l => (
                                <div key={l.id} className="p-4 flex gap-4 hover:bg-gray-50 transition-colors group cursor-pointer">
                                    <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                        <img src={l.imageUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-900 text-sm truncate">{l.title}</div>
                                        <div className="text-xs text-gray-500 mt-1">{l.bidsCount} Bids • {l.isSold ? 'Sold' : 'Active'}</div>
                                    </div>
                                    <div className="font-bold text-sm text-gray-900">${l.price}</div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'BREAKS' && (
                    <div className="divide-y divide-gray-100">
                        {(myHostedBreaks.length === 0 && myJoinedBreaks.length === 0) ? (
                            <EmptyState icon="📺" message="No break history" />
                        ) : (
                            <>
                                {myHostedBreaks.map(l => (
                                    <div key={l.id} className="p-4 flex gap-4 hover:bg-gray-50 transition-colors">
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-lg border border-purple-200 shrink-0">
                                            🎥
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 text-sm truncate">{l.title}</div>
                                            <div className="text-xs text-purple-600 font-bold mt-1 uppercase">Hosted by You</div>
                                        </div>
                                    </div>
                                ))}
                                {/* Simplified view for joined breaks - In real app would fetch listing details */}
                                {myJoinedBreaks.map((listingId) => {
                                    const joined = listingById.get(listingId);
                                    return (
                                    <div key={listingId} className="p-4 flex gap-4 hover:bg-gray-50 transition-colors">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-lg border border-blue-200 shrink-0">
                                            🎟️
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 text-sm truncate">{joined?.title ?? `Break #${listingId.slice(0, 6)}`}</div>
                                            <div className="text-xs text-blue-600 font-bold mt-1 uppercase">Participant{joined?.breakStatus ? ` • ${joined.breakStatus}` : ""}</div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ icon: string, message: string }> = ({ icon, message }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3 opacity-50">{icon}</div>
        <p className="text-gray-400 font-medium text-sm">{message}</p>
    </div>
);
