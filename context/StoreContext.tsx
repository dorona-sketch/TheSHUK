
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
    Listing, Bid, Notification, User, AppMode, ListingType, SortOption, 
    SearchScope, BreakStatus, BreakEntryStatus, BreakEntry, LiveEvent, 
    LiveChatMessage, Group, Thread, Comment, WalletTransaction, TransactionType,
    PokemonType, CardCategory, VariantTag, Condition, GradingCompany, SealedProductType,
    LiveEventType, PaymentIntent, PaymentStatus
} from '../types';
import { useAuth } from './AuthContext';
import { 
    INITIAL_LISTINGS, INITIAL_GROUPS, INITIAL_THREADS, INITIAL_COMMENTS, 
    MOCK_TRANSACTIONS, MOCK_PAYMENT_INTENTS
} from '../constants';
import { parseDate } from '../utils/dateUtils';
import { fetchTcgSets } from '../services/tcgApiService';

// Define Filters Interface
export interface Filters {
    searchQuery: string;
    searchScope: SearchScope;
    priceRange: { min: number | null; max: number | null };
    condition: Condition[];
    gradingCompany: GradingCompany[];
    sealedProductType: SealedProductType[];
    pokemonTypes: PokemonType[];
    cardCategories: CardCategory[];
    variantTags: VariantTag[];
    breakStatus: BreakStatus[];
    pokemonName?: string;
    language?: string;
    series?: string;
    set?: string;
}

interface StoreContextType {
    listings: Listing[];
    filteredListings: Listing[];
    bids: Bid[];
    notifications: Notification[];
    transactions: WalletTransaction[];
    groups: Group[];
    threads: Thread[];
    appMode: AppMode;
    loading: boolean;
    filters: Filters;
    sortOption: SortOption;
    availableSets: any[];
    liveChatHistory: Record<string, LiveChatMessage[]>;
    currentUser: User | null; // Exposed for convenience

    setAppMode: (mode: AppMode) => void;
    setFilter: (key: keyof Filters, value: any) => void;
    setSortOption: (option: SortOption) => void;
    resetFilters: () => void;
    
    addListing: (listing: Partial<Listing>) => void;
    updateListing: (id: string, updates: Partial<Listing>) => void;
    
    placeBid: (listingId: string, amount: number) => { success: boolean; message: string };
    buyNow: (listingId: string) => { success: boolean; message: string };
    getBidsByListingId: (listingId: string) => Bid[];
    
    // Breaks
    joinBreak: (listingId: string) => Promise<{ success: boolean; message: string }>;
    getBreakEntries: (listingId: string) => BreakEntry[];
    removeBreakEntry: (entryId: string) => Promise<{ success: boolean; message: string }>;
    scheduleBreak: (listingId: string, date: Date, link: string) => { success: boolean; message: string };
    startBreak: (listingId: string) => void;
    completeBreak: (listingId: string, media: string[], notes: string) => void;
    cancelBreak: (listingId: string) => void;
    joinWaitlist: (listingId: string) => Promise<{ success: boolean; message: string }>;
    
    // Live
    getLiveEvents: (listingId: string) => LiveEvent[];
    publishLiveEvent: (listingId: string, type: any, payload: any) => void;
    addLiveChatMessage: (listingId: string, msg: LiveChatMessage) => void;
    
    // Community
    getRecommendedGroups: () => { group: Group, reason: string }[];
    joinGroup: (groupId: string) => void;
    leaveGroup: (groupId: string) => void;
    getGroupThreads: (groupId: string) => Thread[];
    getThreadComments: (threadId: string) => Comment[];
    createThread: (groupId: string, title: string, body: string) => void;
    postComment: (threadId: string, body: string) => void;
    
    // Wallet / Notifs
    depositFunds: (amount: number) => Promise<{ success: boolean; message: string }>;
    withdrawFunds: (amount: number) => Promise<{ success: boolean; message: string }>;
    markNotificationRead: (id: string) => void;
    markAllNotificationsRead: () => void;
    
    // Helpers
    getEndingSoonAuctions: (limit?: number) => Listing[];
    getClosingBreaks: (limit?: number) => Listing[];
    getSuggestions: (scope: SearchScope, query: string) => string[];
    getRelatedListings: (listing: Listing) => Listing[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: currentUser, updateProfile } = useAuth();
    
    const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
    const [bids, setBids] = useState<Bid[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [transactions, setTransactions] = useState<WalletTransaction[]>(MOCK_TRANSACTIONS);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
    const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
    const [breakEntries, setBreakEntries] = useState<BreakEntry[]>([]);
    const [paymentIntents, setPaymentIntents] = useState<PaymentIntent[]>(MOCK_PAYMENT_INTENTS);
    const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
    const [liveChatHistory, setLiveChatHistory] = useState<Record<string, LiveChatMessage[]>>({});
    
    const [appMode, setAppMode] = useState<AppMode>(AppMode.COMBINED);
    const [loading, setLoading] = useState(false);
    const [availableSets, setAvailableSets] = useState<any[]>([]);

    // Filter State
    const [filters, setFilters] = useState<Filters>({
        searchQuery: '',
        searchScope: SearchScope.ALL,
        priceRange: { min: null, max: null },
        condition: [],
        gradingCompany: [],
        sealedProductType: [],
        pokemonTypes: [],
        cardCategories: [],
        variantTags: [],
        breakStatus: [],
        pokemonName: '',
        language: '',
        series: '',
        set: ''
    });
    const [sortOption, setSortOption] = useState<SortOption>(SortOption.NEWEST);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const sets = await fetchTcgSets();
            setAvailableSets(sets);
            setLoading(false);
        };
        load();
    }, []);

    // ... Helper Logic (Filtering, Sorting) ...
    const filteredListings = useMemo(() => {
        let result = listings;

        // Mode Filter
        if (appMode === AppMode.MARKETPLACE) {
            result = result.filter(l => l.type !== ListingType.TIMED_BREAK);
        } else if (appMode === AppMode.BREAKS) {
            result = result.filter(l => l.type === ListingType.TIMED_BREAK);
        }

        // Text Search
        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            result = result.filter(l => {
                if (filters.searchScope === SearchScope.ALL) {
                    return l.title.toLowerCase().includes(q) || l.setName?.toLowerCase().includes(q) || l.pokemonName?.toLowerCase().includes(q);
                }
                if (filters.searchScope === SearchScope.TITLE) return l.title.toLowerCase().includes(q);
                if (filters.searchScope === SearchScope.POKEMON) return l.pokemonName?.toLowerCase().includes(q);
                if (filters.searchScope === SearchScope.SET) return l.setName?.toLowerCase().includes(q);
                if (filters.searchScope === SearchScope.SELLER) return l.sellerName.toLowerCase().includes(q);
                if (filters.searchScope === SearchScope.BOOSTER) return l.boosterName?.toLowerCase().includes(q);
                return true;
            });
        }

        // Detailed Filters
        if (filters.pokemonName) result = result.filter(l => l.pokemonName?.toLowerCase().includes(filters.pokemonName!.toLowerCase()));
        if (filters.language) result = result.filter(l => l.language === filters.language);
        if (filters.series) result = result.filter(l => l.series === filters.series);
        if (filters.set) result = result.filter(l => l.setId === filters.set);
        
        if (filters.priceRange.min !== null) result = result.filter(l => l.price >= filters.priceRange.min!);
        if (filters.priceRange.max !== null) result = result.filter(l => l.price <= filters.priceRange.max!);
        
        if (filters.condition.length) result = result.filter(l => l.condition && filters.condition.includes(l.condition));
        if (filters.gradingCompany.length) result = result.filter(l => l.gradingCompany && filters.gradingCompany.includes(l.gradingCompany));
        if (filters.sealedProductType.length) result = result.filter(l => l.sealedProductType && filters.sealedProductType.includes(l.sealedProductType));
        if (filters.pokemonTypes.length) result = result.filter(l => l.pokemonType && filters.pokemonTypes.includes(l.pokemonType));
        if (filters.cardCategories.length) result = result.filter(l => l.cardCategory && filters.cardCategories.includes(l.cardCategory));
        if (filters.variantTags.length) result = result.filter(l => l.variantTags && l.variantTags.some(t => filters.variantTags.includes(t)));
        if (filters.breakStatus.length) result = result.filter(l => l.breakStatus && filters.breakStatus.includes(l.breakStatus));

        // Sorting
        result = [...result].sort((a, b) => {
            switch (sortOption) {
                case SortOption.PRICE_ASC: return (a.currentBid || a.price) - (b.currentBid || b.price);
                case SortOption.PRICE_DESC: return (b.currentBid || b.price) - (a.currentBid || a.price);
                case SortOption.ENDING_SOON: 
                    const dateA = a.endsAt || a.closesAt || new Date(8640000000000000);
                    const dateB = b.endsAt || b.closesAt || new Date(8640000000000000);
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                case SortOption.MOST_BIDS: return (b.bidsCount || 0) - (a.bidsCount || 0);
                case SortOption.NEWEST: default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

        return result;
    }, [listings, appMode, filters, sortOption]);

    // Actions
    const setFilter = (key: keyof Filters, value: any) => setFilters(prev => ({ ...prev, [key]: value }));
    const resetFilters = () => setFilters({
        searchQuery: '', searchScope: SearchScope.ALL, priceRange: { min: null, max: null },
        condition: [], gradingCompany: [], sealedProductType: [], pokemonTypes: [],
        cardCategories: [], variantTags: [], breakStatus: [], pokemonName: '',
        language: '', series: '', set: ''
    });

    const addListing = (listing: Partial<Listing>) => {
        if (!currentUser) return;
        const newListing: Listing = {
            ...listing as Listing,
            id: `l_${Date.now()}`,
            sellerId: currentUser.id,
            sellerName: currentUser.displayName || currentUser.name,
            sellerAvatar: currentUser.avatarUrl,
            sellerVerified: currentUser.isVerifiedSeller,
            createdAt: new Date(),
            bidsCount: 0,
            currentBid: 0,
            breakStatus: listing.type === ListingType.TIMED_BREAK ? BreakStatus.OPEN : undefined,
            currentParticipants: 0
        };
        setListings(prev => [newListing, ...prev]);
    };

    const updateListing = (id: string, updates: Partial<Listing>) => {
        setListings(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const placeBid = (listingId: string, amount: number) => {
        if (!currentUser) return { success: false, message: 'Please login' };
        
        const listing = listings.find(l => l.id === listingId);
        if (!listing) return { success: false, message: 'Listing not found' };
        if (listing.isSold) return { success: false, message: 'Item sold' };
        if (listing.sellerId === currentUser.id) return { success: false, message: 'Cannot bid on your own listing' };
        
        // Date Validation
        const endDate = parseDate(listing.endsAt);
        if (endDate && new Date() > endDate) return { success: false, message: 'Auction has ended' };

        // Amount Validation
        const currentHighest = listing.currentBid || 0;
        const startPrice = listing.price || 0;
        const minBid = currentHighest > 0 ? currentHighest : startPrice;
        
        if (amount <= currentHighest && currentHighest > 0) return { success: false, message: `Bid must be > $${currentHighest}` };
        if (amount < startPrice) return { success: false, message: `Bid must be >= $${startPrice}` };

        const newBid: Bid = {
            id: `b_${Date.now()}`,
            listingId,
            bidderId: currentUser.id,
            bidderName: currentUser.displayName || currentUser.name,
            amount,
            createdAt: new Date()
        };

        setBids(prev => [newBid, ...prev]);
        
        let newEndsAt = listing.endsAt;
        if (endDate && endDate.getTime() - Date.now() < 120000) {
            newEndsAt = new Date(Date.now() + 120000); 
        }

        updateListing(listingId, { 
            currentBid: amount, 
            bidsCount: (listing.bidsCount || 0) + 1, 
            highBidderId: currentUser.id,
            endsAt: newEndsAt
        });

        // Notify previous bidder
        if (listing.highBidderId && listing.highBidderId !== currentUser.id) {
            const notif: Notification = {
                id: `n_${Date.now()}`,
                userId: listing.highBidderId,
                type: 'BID_WON', // Misnomer in types, effectively OUTBID
                title: 'Outbid!',
                message: `New high bid of $${amount} on ${listing.title}.`,
                isRead: false,
                createdAt: new Date(),
                linkTo: listing.id
            };
            setNotifications(prev => [notif, ...prev]);
        }
        return { success: true, message: 'Bid placed successfully!' };
    };

    const buyNow = (listingId: string) => {
        if (!currentUser) return { success: false, message: 'Please login' };
        const listing = listings.find(l => l.id === listingId);
        if (!listing) return { success: false, message: 'Not found' };
        if (listing.isSold) return { success: false, message: 'Already sold' };
        if (listing.sellerId === currentUser.id) return { success: false, message: 'Cannot buy own item' };

        if (currentUser.walletBalance < listing.price) return { success: false, message: 'Insufficient funds' };

        // Process Transaction
        const tx: WalletTransaction = {
            id: `tx_${Date.now()}`,
            userId: currentUser.id,
            amount: -listing.price,
            type: TransactionType.PURCHASE,
            description: `Purchased: ${listing.title}`,
            balanceAfter: currentUser.walletBalance - listing.price,
            createdAt: new Date(),
            referenceId: listing.id,
            referenceType: 'LISTING'
        };
        setTransactions(prev => [tx, ...prev]);
        updateProfile({ walletBalance: currentUser.walletBalance - listing.price });

        updateListing(listingId, { isSold: true });
        
        // Notify Seller
        const notif: Notification = {
            id: `n_sale_${Date.now()}`,
            userId: listing.sellerId,
            type: 'SALE',
            title: 'Item Sold!',
            message: `${listing.title} was purchased by ${currentUser.name}.`,
            isRead: false,
            createdAt: new Date(),
            linkTo: listing.id
        };
        setNotifications(prev => [notif, ...prev]);

        return { success: true, message: 'Purchase successful!' };
    };

    /**
     * Join Break Logic:
     * 1. Check Capacity
     * 2. Create Authorized Payment Intent (Mock)
     * 3. Create BreakEntry with expiration
     * 4. If Full -> Trigger Charge on Threshold Logic
     */
    const joinBreak = async (listingId: string) => {
        if (!currentUser) return { success: false, message: 'Please login' };
        
        const listing = listings.find(l => l.id === listingId);
        if (!listing) return { success: false, message: 'Not found' };
        
        if (listing.breakStatus !== BreakStatus.OPEN) {
             return { success: false, message: 'Break is not open' };
        }

        if ((listing.currentParticipants || 0) >= (listing.targetParticipants || 0)) {
            return { success: false, message: 'Break is full' };
        }

        // 1. Create Authorization (Expires in 7 days)
        const authExpires = new Date();
        authExpires.setDate(authExpires.getDate() + 7);

        const pi: PaymentIntent = {
            id: `pi_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
            userId: currentUser.id,
            amount: listing.price,
            currency: 'USD',
            status: PaymentStatus.AUTHORIZED,
            provider: 'MOCK',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        setPaymentIntents(prev => [...prev, pi]);

        // 2. Create Entry
        const entry: BreakEntry = {
            id: `be_${Date.now()}_${currentUser.id}`,
            listingId,
            userId: currentUser.id,
            userName: currentUser.displayName || currentUser.name,
            userAvatar: currentUser.avatarUrl,
            joinedAt: new Date(),
            status: BreakEntryStatus.AUTHORIZED,
            authorizationExpiresAt: authExpires,
            paymentIntentId: pi.id
        };

        const newCount = (listing.currentParticipants || 0) + 1;
        const isFull = newCount >= (listing.targetParticipants || 0);
        let newStatus = listing.breakStatus;

        if (isFull) {
            newStatus = BreakStatus.FULL_PENDING_SCHEDULE;
        }

        setBreakEntries(prev => [...prev, entry]);
        
        updateListing(listingId, { 
            currentParticipants: newCount,
            breakStatus: newStatus
        });

        // 3. Charge Logic (Charge-on-Threshold)
        // If this entry made it full, charge EVERYONE in this break.
        if (isFull) {
            // Get all entries including the one just added
            // Note: State update is async, so we manually combine for the logic here
            const allBreakEntries = [...breakEntries, entry].filter(e => e.listingId === listingId);
            
            const newTransactions: WalletTransaction[] = [];
            const chargedEntries: BreakEntry[] = [];

            allBreakEntries.forEach(e => {
                chargedEntries.push({
                    ...e,
                    status: BreakEntryStatus.CHARGED,
                    chargedAt: new Date()
                });

                // Update PI to Captured
                setPaymentIntents(prev => prev.map(p => p.id === e.paymentIntentId ? { ...p, status: PaymentStatus.CAPTURED, updatedAt: new Date() } : p));

                // Create Purchase Transaction
                newTransactions.push({
                    id: `tx_break_${listingId}_${e.userId}`,
                    userId: e.userId,
                    amount: -listing.price,
                    type: TransactionType.PURCHASE,
                    description: `Break Entry: ${listing.title}`,
                    balanceAfter: 0, // In mock, we can't easily calculate others' balance, just assume success
                    createdAt: new Date(),
                    referenceId: e.id,
                    referenceType: 'BREAK_ENTRY'
                });
            });

            // Update all entries to CHARGED
            setBreakEntries(prev => prev.map(e => {
                const updated = chargedEntries.find(c => c.id === e.id);
                return updated || e;
            }));

            setTransactions(prev => [...newTransactions, ...prev]);

            // Update Current User Wallet if they are in the break
            if (chargedEntries.some(e => e.userId === currentUser.id)) {
                updateProfile({ walletBalance: currentUser.walletBalance - listing.price });
            }

            // Notify Seller
             const notif: Notification = {
                id: `n_full_${Date.now()}`,
                userId: listing.sellerId,
                type: 'BREAK_FULL',
                title: 'Break Full!',
                message: `${listing.title} is sold out and ready to schedule.`,
                isRead: false,
                createdAt: new Date(),
                linkTo: listing.id
            };
            setNotifications(prev => [notif, ...prev]);
        }

        return { success: true, message: isFull ? 'Joined! Break full, payment captured.' : 'Joined! Authorization hold placed.' };
    };

    const getBreakEntries = (listingId: string) => breakEntries.filter(e => e.listingId === listingId);
    
    /**
     * Handle participant removal.
     * If they were CHARGED, process REFUND.
     * If AUTHORIZED, VOID authorization.
     */
    const removeBreakEntry = async (entryId: string) => {
        const entry = breakEntries.find(e => e.id === entryId);
        if (!entry) return { success: false, message: 'Entry not found' };
        
        const listing = listings.find(l => l.id === entry.listingId);
        
        // Remove from list
        setBreakEntries(prev => prev.filter(e => e.id !== entryId));
        
        if (listing) {
            // Update listing counts and status
            const newCount = Math.max(0, (listing.currentParticipants || 1) - 1);
            let newStatus = listing.breakStatus;
            
            // If it was full, re-open it
            if (listing.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE) {
                newStatus = BreakStatus.OPEN;
            }

            updateListing(listing.id, {
                currentParticipants: newCount,
                breakStatus: newStatus
            });
        }

        // Financial Logic
        if (entry.status === BreakEntryStatus.AUTHORIZED) {
            // Void
            setPaymentIntents(prev => prev.map(p => p.id === entry.paymentIntentId ? { ...p, status: PaymentStatus.FAILED, metadata: { reason: 'Voided' } } : p));
        } else if (entry.status === BreakEntryStatus.CHARGED) {
            // Refund
            const listingPrice = listing?.price || 0;
            
            setPaymentIntents(prev => prev.map(p => p.id === entry.paymentIntentId ? { ...p, status: PaymentStatus.REFUNDED } : p));
            
            const refundTx: WalletTransaction = {
                id: `tx_ref_${entry.id}`,
                userId: entry.userId,
                amount: listingPrice,
                type: TransactionType.REFUND,
                description: `Refund: ${listing?.title || 'Break Entry'}`,
                balanceAfter: 0, 
                createdAt: new Date(),
                referenceId: entry.id,
                referenceType: 'BREAK_ENTRY'
            };
            setTransactions(prev => [refundTx, ...prev]);

            if (currentUser && currentUser.id === entry.userId) {
                updateProfile({ walletBalance: currentUser.walletBalance + listingPrice });
            }
        }

        return { success: true, message: 'Removed (Refunded/Voided)' };
    };

    const scheduleBreak = (listingId: string, date: Date, link: string) => {
        updateListing(listingId, { 
            scheduledLiveAt: date, 
            liveLink: link,
            breakStatus: BreakStatus.SCHEDULED 
        });
        
        // Notify participants
        const entries = getBreakEntries(listingId);
        entries.forEach(e => {
             const notif: Notification = {
                id: `n_sched_${Date.now()}_${e.userId}`,
                userId: e.userId,
                type: 'BREAK_LIVE', // Approximate
                title: 'Break Scheduled',
                message: `Your break has been scheduled for ${date.toLocaleString()}.`,
                isRead: false,
                createdAt: new Date(),
                linkTo: listingId
            };
            setNotifications(prev => [notif, ...prev]);
        });

        return { success: true, message: 'Scheduled!' };
    };

    const startBreak = (listingId: string) => {
        updateListing(listingId, { breakStatus: BreakStatus.LIVE, liveStartedAt: new Date() });
        publishLiveEvent(listingId, LiveEventType.BREAK_START, { message: "The break has started!" });
        
        // Notify participants
        const entries = getBreakEntries(listingId);
        entries.forEach(e => {
             const notif: Notification = {
                id: `n_live_${Date.now()}_${e.userId}`,
                userId: e.userId,
                type: 'BREAK_LIVE',
                title: 'Break is LIVE!',
                message: `Join the stream now!`,
                isRead: false,
                createdAt: new Date(),
                linkTo: listingId
            };
            setNotifications(prev => [notif, ...prev]);
        });
    };

    const completeBreak = (listingId: string, media: string[], notes: string) => {
        updateListing(listingId, { 
            breakStatus: BreakStatus.COMPLETED, 
            liveEndedAt: new Date(),
            resultsMedia: media,
            resultsNotes: notes
        });
        
        publishLiveEvent(listingId, LiveEventType.BREAK_END, { message: "Break completed." });
    };

    const cancelBreak = (listingId: string) => {
        updateListing(listingId, { breakStatus: BreakStatus.CANCELLED });
        
        // Process Bulk Refunds
        const entries = breakEntries.filter(e => e.listingId === listingId);
        const refundTxs: WalletTransaction[] = [];
        const listing = listings.find(l => l.id === listingId);
        const price = listing?.price || 0;

        const updatedEntries = entries.map(e => {
            if (e.status === BreakEntryStatus.CHARGED) {
                refundTxs.push({
                    id: `tx_ref_${e.id}`,
                    userId: e.userId,
                    amount: price,
                    type: TransactionType.REFUND,
                    description: `Break Cancelled: ${listing?.title}`,
                    balanceAfter: 0,
                    createdAt: new Date(),
                    referenceId: e.id,
                    referenceType: 'BREAK_ENTRY'
                });
                setPaymentIntents(prev => prev.map(p => p.id === e.paymentIntentId ? { ...p, status: PaymentStatus.REFUNDED } : p));
            } else if (e.status === BreakEntryStatus.AUTHORIZED) {
                setPaymentIntents(prev => prev.map(p => p.id === e.paymentIntentId ? { ...p, status: PaymentStatus.FAILED } : p));
            }
            return { ...e, status: BreakEntryStatus.CANCELLED };
        });

        setBreakEntries(prev => prev.map(e => {
            const updated = updatedEntries.find(u => u.id === e.id);
            return updated || e;
        }));
        
        setTransactions(prev => [...refundTxs, ...prev]);

        // Refund currentUser instantly if affected
        const myRefund = refundTxs.filter(tx => tx.userId === currentUser?.id).reduce((acc, tx) => acc + tx.amount, 0);
        if (currentUser && myRefund > 0) {
            updateProfile({ walletBalance: currentUser.walletBalance + myRefund });
        }

        // Notify
        entries.forEach(e => {
             const notif: Notification = {
                id: `n_can_${Date.now()}_${e.userId}`,
                userId: e.userId,
                type: 'BREAK_CANCELLED',
                title: 'Break Cancelled',
                message: `The break you joined has been cancelled. Funds have been released/refunded.`,
                isRead: false,
                createdAt: new Date(),
                linkTo: listingId
            };
            setNotifications(prev => [notif, ...prev]);
        });
    };

    const joinWaitlist = async (listingId: string) => {
        return { success: true, message: 'Joined waitlist' };
    };

    const getLiveEvents = (listingId: string) => liveEvents.filter(e => e.breakId === listingId);
    
    const publishLiveEvent = (listingId: string, type: any, payload: any) => {
        const event: LiveEvent = {
            id: `le_${Date.now()}`,
            breakId: listingId,
            type,
            payload,
            createdAt: new Date()
        };
        setLiveEvents(prev => [...prev, event]);
    };

    const addLiveChatMessage = (listingId: string, msg: LiveChatMessage) => {
        setLiveChatHistory(prev => ({
            ...prev,
            [listingId]: [...(prev[listingId] || []), msg]
        }));
    };

    const getBidsByListingId = (listingId: string) => bids.filter(b => b.listingId === listingId).sort((a, b) => b.amount - a.amount);

    const depositFunds = async (amount: number) => {
        if (!currentUser) return { success: false, message: 'Login' };
        updateProfile({ walletBalance: currentUser.walletBalance + amount });
        const tx: WalletTransaction = {
            id: `tx_dep_${Date.now()}`,
            userId: currentUser.id,
            amount,
            type: TransactionType.DEPOSIT,
            description: 'Funds Added',
            balanceAfter: currentUser.walletBalance + amount,
            createdAt: new Date()
        };
        setTransactions(prev => [tx, ...prev]);
        return { success: true, message: 'Funds added' };
    };

    const withdrawFunds = async (amount: number) => {
        if (!currentUser) return { success: false, message: 'Login' };
        if (currentUser.walletBalance < amount) return { success: false, message: 'Insufficient funds' };
        updateProfile({ walletBalance: currentUser.walletBalance - amount });
        return { success: true, message: 'Withdrawal processed' };
    };

    const markNotificationRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const markAllNotificationsRead = () => {
        if (currentUser) {
            setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, isRead: true } : n));
        }
    };

    // --- Getters ---
    const getEndingSoonAuctions = (limit = 3) => {
        return listings
            .filter(l => l.type === ListingType.AUCTION && !l.isSold)
            .sort((a, b) => {
                const dA = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
                const dB = b.endsAt ? new Date(b.endsAt).getTime() : Infinity;
                return dA - dB;
            })
            .slice(0, limit);
    };

    const getClosingBreaks = (limit = 3) => {
        return listings
            .filter(l => l.type === ListingType.TIMED_BREAK && l.breakStatus === BreakStatus.OPEN)
            .sort((a, b) => {
                const rA = (a.currentParticipants || 0) / (a.targetParticipants || 1);
                const rB = (b.currentParticipants || 0) / (b.targetParticipants || 1);
                return rB - rA; // Highest fill % first
            })
            .slice(0, limit);
    };

    const getSuggestions = (scope: SearchScope, query: string) => {
        const q = query.toLowerCase();
        const set = new Set<string>();
        listings.forEach(l => {
            if (scope === SearchScope.TITLE || scope === SearchScope.ALL) if (l.title.toLowerCase().includes(q)) set.add(l.title);
            if (scope === SearchScope.POKEMON || scope === SearchScope.ALL) if (l.pokemonName?.toLowerCase().includes(q)) set.add(l.pokemonName!);
            if (scope === SearchScope.SET || scope === SearchScope.ALL) if (l.setName?.toLowerCase().includes(q)) set.add(l.setName!);
        });
        return Array.from(set).slice(0, 5);
    };

    const getRelatedListings = (listing: Listing) => {
        return listings.filter(l => 
            l.id !== listing.id && 
            !l.isSold &&
            (l.setId === listing.setId || l.pokemonName === listing.pokemonName)
        ).slice(0, 4);
    };

    // Community
    const getRecommendedGroups = () => {
        // Mock recommendation logic
        if (!currentUser) return [];
        return groups
            .filter(g => !currentUser.joinedGroupIds?.includes(g.id))
            .slice(0, 3)
            .map(g => ({ group: g, reason: 'Popular' }));
    };

    const joinGroup = (groupId: string) => {
        if (!currentUser) return;
        const currentGroups = currentUser.joinedGroupIds || [];
        if (!currentGroups.includes(groupId)) {
            updateProfile({ joinedGroupIds: [...currentGroups, groupId] });
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, memberCount: g.memberCount + 1 } : g));
        }
    };

    const leaveGroup = (groupId: string) => {
        if (!currentUser) return;
        const currentGroups = currentUser.joinedGroupIds || [];
        updateProfile({ joinedGroupIds: currentGroups.filter(id => id !== groupId) });
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g));
    };

    const getGroupThreads = (groupId: string) => threads.filter(t => t.groupId === groupId);
    
    const getThreadComments = (threadId: string) => comments.filter(c => c.threadId === threadId);

    const createThread = (groupId: string, title: string, body: string) => {
        if (!currentUser) return;
        const thread: Thread = {
            id: `t_${Date.now()}`,
            groupId,
            authorId: currentUser.id,
            authorName: currentUser.displayName || currentUser.name,
            authorAvatar: currentUser.avatarUrl,
            title,
            body,
            createdAt: new Date(),
            updatedAt: new Date(),
            upvotes: 0,
            commentCount: 0
        };
        setThreads(prev => [thread, ...prev]);
    };

    const postComment = (threadId: string, body: string) => {
        if (!currentUser) return;
        const comment: Comment = {
            id: `c_${Date.now()}`,
            threadId,
            authorId: currentUser.id,
            authorName: currentUser.displayName || currentUser.name,
            authorAvatar: currentUser.avatarUrl,
            body,
            createdAt: new Date(),
            upvotes: 0
        };
        setComments(prev => [...prev, comment]);
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, commentCount: t.commentCount + 1 } : t));
    };

    const value = {
        listings, filteredListings, bids, notifications, transactions, groups, threads,
        appMode, loading, filters, sortOption, availableSets, liveChatHistory, currentUser,
        setAppMode, setFilter, setSortOption, resetFilters, addListing, updateListing,
        placeBid, buyNow, getBidsByListingId, joinBreak, getBreakEntries, removeBreakEntry,
        scheduleBreak, startBreak, completeBreak, cancelBreak, joinWaitlist, getLiveEvents,
        publishLiveEvent, addLiveChatMessage, getRecommendedGroups, joinGroup, leaveGroup,
        getGroupThreads, getThreadComments, createThread, postComment, depositFunds,
        withdrawFunds, markNotificationRead, markAllNotificationsRead, getEndingSoonAuctions,
        getClosingBreaks, getSuggestions, getRelatedListings
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};
