
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Listing, ListingType, BreakStatus, TransactionType } from '../../types';
import { ListingCard } from '../ListingCard';
import { formatLocalTime } from '../../utils/dateUtils';

interface SellerDashboardProps {
    onNavigate: (view: any, id?: string) => void;
    onEdit: (listing: Listing | null) => void;
    onInteract: (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => void;
}

// --- Sub-Component: Lightweight Bar Chart ---
const RevenueChart: React.FC<{ data: { date: string; amount: number }[] }> = ({ data }) => {
    const maxVal = Math.max(...data.map(d => d.amount), 100); // Default min scale 100

    return (
        <div className="h-48 flex items-end gap-2 sm:gap-4 mt-4 select-none">
            {data.map((d, i) => {
                const heightPct = (d.amount / maxVal) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center group">
                        <div className="relative w-full flex items-end justify-center h-full">
                            <div 
                                style={{ height: `${heightPct}%` }} 
                                className={`w-full max-w-[30px] rounded-t-sm transition-all duration-500 ${d.amount > 0 ? 'bg-primary-500 group-hover:bg-primary-600' : 'bg-gray-100'}`}
                            ></div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                                ${d.amount.toLocaleString()}
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-2 font-medium">{d.date}</div>
                    </div>
                );
            })}
        </div>
    );
};

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onNavigate, onEdit, onInteract }) => {
    const { currentUser, listings, transactions, withdrawFunds } = useStore();
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'BREAKS' | 'SOLD'>('ACTIVE');
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    if (!currentUser) return null;

    // --- Advanced Stats Calculations ---
    const myListings = useMemo(() => listings.filter(l => l.sellerId === currentUser.id), [listings, currentUser.id]);
    
    const dashboardData = useMemo(() => {
        // 1. Transaction Filtering
        const myIncomeTx = transactions.filter(t => 
            t.userId === currentUser.id && 
            t.type === TransactionType.DEPOSIT && 
            t.amount > 0
        );

        const totalRevenue = myIncomeTx.reduce((acc, t) => acc + t.amount, 0);

        // 2. Trend Calculation (Last 30 Days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const revLast30 = myIncomeTx
            .filter(t => new Date(t.createdAt) >= thirtyDaysAgo)
            .reduce((acc, t) => acc + t.amount, 0);
        
        const revPrior30 = myIncomeTx
            .filter(t => new Date(t.createdAt) >= sixtyDaysAgo && new Date(t.createdAt) < thirtyDaysAgo)
            .reduce((acc, t) => acc + t.amount, 0);

        const growthPct = revPrior30 === 0 ? 100 : Math.round(((revLast30 - revPrior30) / revPrior30) * 100);

        // 3. Chart Data (Last 7 Days)
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon"
            
            // Normalize dates to ignore time
            const dayStart = new Date(d.setHours(0,0,0,0));
            const dayEnd = new Date(d.setHours(23,59,59,999));

            const dailyTotal = myIncomeTx
                .filter(t => {
                    const txDate = new Date(t.createdAt);
                    return txDate >= dayStart && txDate <= dayEnd;
                })
                .reduce((acc, t) => acc + t.amount, 0);
            
            chartData.push({ date: dayStr, amount: dailyTotal });
        }

        // 4. Listing Counters
        const soldCount = myListings.filter(l => l.isSold || l.breakStatus === BreakStatus.COMPLETED).length;
        const activeCount = myListings.filter(l => !l.isSold && l.type !== ListingType.TIMED_BREAK).length;
        
        // 5. Action Items
        const pendingSchedule = myListings.filter(l => l.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE).length;
        const activeBreaks = myListings.filter(l => l.type === ListingType.TIMED_BREAK && l.breakStatus !== BreakStatus.COMPLETED && l.breakStatus !== BreakStatus.EXPIRED).length;

        return { 
            totalRevenue, 
            revLast30, 
            growthPct, 
            chartData, 
            soldCount, 
            activeCount, 
            activeBreaks,
            pendingSchedule
        };
    }, [transactions, myListings, currentUser.id]);

    const handleWithdraw = async () => {
        const amount = prompt("Enter amount to withdraw:", currentUser.walletBalance.toString());
        if (!amount) return;
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return alert("Invalid amount");
        
        setIsWithdrawing(true);
        const res = await withdrawFunds(val);
        setIsWithdrawing(false);
        alert(res.message);
    };

    // --- Filter Lists ---
    const displayedListings = useMemo(() => {
        switch (activeTab) {
            case 'ACTIVE':
                return myListings.filter(l => 
                    !l.isSold && 
                    l.type !== ListingType.TIMED_BREAK && 
                    l.breakStatus !== BreakStatus.EXPIRED
                ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            case 'BREAKS':
                return myListings.filter(l => l.type === ListingType.TIMED_BREAK).sort((a, b) => {
                    // Custom Sort: Pending Schedule > Live > Scheduled > Open > Completed
                    const score = (status?: BreakStatus) => {
                        if (status === BreakStatus.FULL_PENDING_SCHEDULE) return 5;
                        if (status === BreakStatus.LIVE) return 4;
                        if (status === BreakStatus.SCHEDULED) return 3;
                        if (status === BreakStatus.OPEN) return 2;
                        return 1;
                    };
                    return score(b.breakStatus) - score(a.breakStatus);
                });
            case 'SOLD':
                return myListings.filter(l => l.isSold || l.breakStatus === BreakStatus.COMPLETED)
                    .sort((a, b) => {
                        const dateA = a.endsAt || a.liveEndedAt || a.createdAt;
                        const dateB = b.endsAt || b.liveEndedAt || b.createdAt;
                        return new Date(dateB).getTime() - new Date(dateA).getTime();
                    });
            default:
                return [];
        }
    }, [activeTab, myListings]);

    return (
        <div className="space-y-8 animate-fade-in-up pb-12">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Seller Dashboard</h1>
                        {currentUser.isVerifiedSeller && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Welcome back, {currentUser.name}. Here is what's happening today.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => onNavigate('PROFILE')}
                        className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 text-sm transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Manage Account
                    </button>
                    <button 
                        onClick={() => onEdit(null)}
                        className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Create Listing
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Stats Grid */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue (30d)</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dashboardData.growthPct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {dashboardData.growthPct > 0 ? '+' : ''}{dashboardData.growthPct}%
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-gray-900 mb-1">
                                    ${dashboardData.revLast30.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-400 mb-4">Total Lifetime: ${dashboardData.totalRevenue.toLocaleString()}</div>
                                
                                <button 
                                    onClick={handleWithdraw}
                                    disabled={isWithdrawing || currentUser.walletBalance <= 0}
                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg transition-colors border border-gray-200 flex items-center gap-1 disabled:opacity-50"
                                >
                                    {isWithdrawing ? 'Processing...' : 'Withdraw Funds'}
                                </button>
                            </div>
                            {/* Decorative BG Blob */}
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary-50 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Action Required</span>
                                <div className="mt-3 space-y-2">
                                    {dashboardData.pendingSchedule > 0 ? (
                                        <div 
                                            className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
                                            onClick={() => setActiveTab('BREAKS')}
                                        >
                                            <span className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                                Breaks to Schedule
                                            </span>
                                            <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                                {dashboardData.pendingSchedule}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
                                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            All caught up!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-900 text-sm">Revenue Trends</h3>
                            <span className="text-xs text-gray-400">Last 7 Days</span>
                        </div>
                        <RevenueChart data={dashboardData.chartData} />
                    </div>
                </div>

                {/* Right Column: Inventory Summary */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                    <h3 className="font-bold text-gray-900 text-sm mb-6">Inventory Status</h3>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Active Listings</div>
                                    <div className="text-xs text-gray-500">Marketplace</div>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-gray-900">{dashboardData.activeCount}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Live Breaks</div>
                                    <div className="text-xs text-gray-500">Upcoming & Active</div>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-gray-900">{dashboardData.activeBreaks}</span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Sold Items</div>
                                    <div className="text-xs text-gray-500">Lifetime Sales</div>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-gray-900">{dashboardData.soldCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px] flex flex-col">
                <div className="border-b border-gray-200 px-6 pt-4 flex gap-8 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('ACTIVE')}
                        className={`pb-4 text-sm font-bold transition-colors whitespace-nowrap border-b-2 ${activeTab === 'ACTIVE' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Active Listings <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{dashboardData.activeCount}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('BREAKS')}
                        className={`pb-4 text-sm font-bold transition-colors whitespace-nowrap border-b-2 ${activeTab === 'BREAKS' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Timed Breaks <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{dashboardData.activeBreaks}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('SOLD')}
                        className={`pb-4 text-sm font-bold transition-colors whitespace-nowrap border-b-2 ${activeTab === 'SOLD' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Sales History <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{dashboardData.soldCount}</span>
                    </button>
                </div>

                <div className="p-6 flex-1 bg-gray-50/50">
                    {displayedListings.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 border border-gray-200 shadow-sm">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            </div>
                            <p className="text-gray-500 font-medium">No items found in this section.</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'SOLD' ? (
                                // Table Layout for Sold Items
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Final Price</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {displayedListings.map(listing => (
                                                <tr key={listing.id} onClick={() => onNavigate('DETAILS', listing.id)} className="hover:bg-gray-50 cursor-pointer">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10">
                                                                <img className="h-10 w-10 rounded-md object-cover border border-gray-200" src={listing.imageUrl} alt="" />
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{listing.title}</div>
                                                                <div className="text-xs text-gray-500">{listing.setId?.toUpperCase()}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatLocalTime(listing.endsAt || listing.liveEndedAt || listing.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${listing.type === ListingType.TIMED_BREAK ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                            {listing.type === ListingType.TIMED_BREAK ? 'Break' : (listing.type === ListingType.AUCTION ? 'Auction' : 'Sale')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                                        ${listing.type === ListingType.TIMED_BREAK ? ((listing.price * (listing.targetParticipants || 1)).toLocaleString()) : (listing.currentBid || listing.price).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Paid
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                // Grid Layout for Active / Breaks
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {displayedListings.map(listing => (
                                        <div key={listing.id} className="relative group">
                                            <div onClick={() => onNavigate('DETAILS', listing.id)} className="cursor-pointer">
                                                <ListingCard 
                                                    listing={listing}
                                                    onInteract={onInteract}
                                                    actionLabel="Manage"
                                                    currentUserId={currentUser.id}
                                                />
                                            </div>
                                            {/* Quick Action Overlay for Breaks */}
                                            {listing.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE && (
                                                <div className="absolute top-2 right-2 z-20 animate-bounce">
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">
                                                        Action Required
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
