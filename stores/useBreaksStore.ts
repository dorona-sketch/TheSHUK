import React, { useState } from 'react';
import { 
    Listing, ListingType, User, BreakEntry, BreakStatus, BreakEntryStatus, 
    TransactionType, WalletTransaction, Notification, LiveEvent, LiveChatMessage, LiveEventType 
} from '../types';

interface MarketplaceInterface {
    listings: Listing[];
    setListings: React.Dispatch<React.SetStateAction<Listing[]>>;
    updateListing: (id: string, updates: Partial<Listing>) => void;
}

interface WalletInterface {
    setTransactions: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
}

interface NotificationInterface {
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export const useBreaksStore = (
    currentUser: User | null,
    marketplace: MarketplaceInterface,
    wallet: WalletInterface,
    notifications: NotificationInterface,
    updateProfile: (updates: Partial<User>) => Promise<void>
) => {
    const [breakEntries, setBreakEntries] = useState<BreakEntry[]>([]);
    const [liveEvents, setLiveEvents] = useState<Record<string, LiveEvent[]>>({});
    const [liveChatHistory, setLiveChatHistory] = useState<Record<string, LiveChatMessage[]>>({});

    const joinBreak = async (listingId: string) => {
        if (!currentUser) return { success: false, message: 'Please sign in' };
        
        const listing = marketplace.listings.find(l => l.id === listingId);
        if (!listing) return { success: false, message: 'Listing not found' };
        if (listing.type !== ListingType.TIMED_BREAK) return { success: false, message: 'Not a break' };
        
        if (listing.breakStatus !== BreakStatus.OPEN) {
            return { success: false, message: 'Break is not open for joining.' };
        }
        
        if ((listing.currentParticipants || 0) >= (listing.targetParticipants || 0)) {
            return { success: false, message: 'Break is already full.' };
        }

        const price = listing.price;
        if (currentUser.walletBalance < price) return { success: false, message: 'Insufficient funds' };
        
        const currentEntries = breakEntries.filter(e => e.listingId === listingId && e.userId === currentUser.id);
        if (listing.maxEntriesPerUser && currentEntries.length >= listing.maxEntriesPerUser) {
             return { success: false, message: `Max entries (${listing.maxEntriesPerUser}) reached.` };
        }

        // --- ATOMIC UPDATE SIMULATION ---
        let transactionSuccess = false;
        let isFull = false;

        marketplace.setListings(prev => prev.map(l => {
            if (l.id === listingId) {
                if (l.breakStatus !== BreakStatus.OPEN) return l;
                const currentCount = l.currentParticipants || 0;
                const target = l.targetParticipants || 0;
                
                if (currentCount >= target) return l;

                transactionSuccess = true;
                const newCount = currentCount + 1;
                isFull = newCount >= target;

                return {
                    ...l,
                    currentParticipants: newCount,
                    breakStatus: isFull ? BreakStatus.FULL_PENDING_SCHEDULE : BreakStatus.OPEN
                };
            }
            return l;
        }));

        if (!transactionSuccess) {
            return { success: false, message: 'Failed to join: Break is full or unavailable.' };
        }
        
        const authExpiresAt = new Date();
        authExpiresAt.setDate(authExpiresAt.getDate() + 7); 

        const entry: BreakEntry = {
            id: `be_${Date.now()}`,
            listingId,
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatarUrl,
            status: isFull ? BreakEntryStatus.CHARGED : BreakEntryStatus.AUTHORIZED, 
            joinedAt: new Date(),
            authExpiresAt
        };
        
        const tx: WalletTransaction = {
            id: `tx_auth_${Date.now()}`,
            userId: currentUser.id,
            amount: -price,
            type: TransactionType.PURCHASE, 
            description: isFull ? `Purchase: ${listing.title}` : `Auth Hold: ${listing.title}`,
            balanceAfter: currentUser.walletBalance - price,
            createdAt: new Date(),
            referenceId: listingId,
            referenceType: 'BREAK_ENTRY'
        };
        
        setBreakEntries(prev => [...prev, entry]);
        wallet.setTransactions(prev => [tx, ...prev]);
        updateProfile({ walletBalance: tx.balanceAfter });

        if (isFull) {
            setBreakEntries(prev => prev.map(e => {
                if (e.listingId === listingId && e.status === BreakEntryStatus.AUTHORIZED) {
                    return { ...e, status: BreakEntryStatus.CHARGED };
                }
                return e;
            }));

            const sellerNotification: Notification = {
                id: `n_full_${Date.now()}`,
                userId: listing.sellerId,
                title: 'Break Full!',
                message: `Your break "${listing.title}" has filled. Please schedule the live stream.`,
                type: 'BREAK_FULL',
                isRead: false,
                createdAt: new Date(),
                linkTo: listingId
            };
            
            const buyerNotification: Notification = {
                id: `n_join_${Date.now()}`,
                userId: currentUser.id,
                title: 'Break Full!',
                message: `The break "${listing.title}" is full and will be scheduled soon.`,
                type: 'BREAK_FULL',
                isRead: false,
                createdAt: new Date(),
                linkTo: listingId
            };

            notifications.setNotifications(prev => [sellerNotification, buyerNotification, ...prev]);
        }

        return { success: true, message: isFull ? 'Spot secured! Break is now FULL.' : 'Spot secured (Funds Authorized)' };
    };

    const scheduleBreak = (listingId: string, date: Date, link: string) => {
        const listing = marketplace.listings.find(l => l.id === listingId);
        if (!listing) return { success: false, message: 'Listing not found' };

        if (listing.breakStatus !== BreakStatus.FULL_PENDING_SCHEDULE) {
             return { success: false, message: 'Can only schedule breaks that are full.' };
        }

        marketplace.updateListing(listingId, { 
            breakStatus: BreakStatus.SCHEDULED,
            scheduledLiveAt: date,
            liveLink: link
        });
        
        const entries = breakEntries.filter(e => e.listingId === listingId);
        const newNotifs: Notification[] = entries.map(e => ({
            id: `n_sched_${Date.now()}_${e.userId}`,
            userId: e.userId,
            title: 'Break Scheduled',
            message: `The break you joined is scheduled for ${date.toLocaleString()}.`,
            type: 'INFO',
            isRead: false,
            createdAt: new Date(),
            linkTo: listingId
        }));
        
        notifications.setNotifications(prev => [...newNotifs, ...prev]);
        return { success: true, message: 'Break scheduled & Participants notified' };
    };

    const startBreak = (listingId: string) => {
        const listing = marketplace.listings.find(l => l.id === listingId);
        if (!listing) return;

        if (listing.breakStatus !== BreakStatus.SCHEDULED && listing.breakStatus !== BreakStatus.FULL_PENDING_SCHEDULE) {
            console.warn("Invalid transition to LIVE");
            return;
        }

        marketplace.updateListing(listingId, { breakStatus: BreakStatus.LIVE });
        publishLiveEvent(listingId, LiveEventType.BREAK_START, { message: 'Stream Starting!' });
        
        const entries = breakEntries.filter(e => e.listingId === listingId);
        const newNotifs: Notification[] = entries.map(e => ({
            id: `n_live_${Date.now()}_${e.userId}`,
            userId: e.userId,
            title: 'Break LIVE!',
            message: `The break is happening now! Click to watch.`,
            type: 'BREAK_LIVE',
            isRead: false,
            createdAt: new Date(),
            linkTo: listingId
        }));
        notifications.setNotifications(prev => [...newNotifs, ...prev]);
    };

    const completeBreak = (listingId: string, media: string[], notes: string) => {
        const listing = marketplace.listings.find(l => l.id === listingId);
        if (listing?.breakStatus !== BreakStatus.LIVE) return;

        marketplace.updateListing(listingId, { 
            breakStatus: BreakStatus.COMPLETED,
            resultsMedia: media,
            resultsNotes: notes,
            liveEndedAt: new Date()
        });
        publishLiveEvent(listingId, LiveEventType.BREAK_END, { message: 'Break Completed' });
    };

    const cancelBreak = (listingId: string) => {
        marketplace.updateListing(listingId, { breakStatus: BreakStatus.CANCELLED });
        const entries = breakEntries.filter(e => e.listingId === listingId);
        const listing = marketplace.listings.find(l => l.id === listingId);
        const refundAmount = listing?.price || 0;
        
        entries.forEach(e => {
            const tx: WalletTransaction = {
                id: `tx_ref_${Date.now()}_${e.userId}`,
                userId: e.userId,
                amount: refundAmount,
                type: TransactionType.REFUND,
                description: `Refund: ${listing?.title}`,
                balanceAfter: 0, 
                createdAt: new Date(),
                referenceId: listingId
            };
            wallet.setTransactions(prev => [tx, ...prev]);
            if (currentUser?.id === e.userId) {
                updateProfile({ walletBalance: (currentUser.walletBalance || 0) + refundAmount });
            }
        });
        setBreakEntries(prev => prev.map(e => e.listingId === listingId ? { ...e, status: BreakEntryStatus.CANCELLED } : e));
    };

    const removeBreakEntry = async (entryId: string) => {
        const entry = breakEntries.find(e => e.id === entryId);
        if (!entry) return { success: false, message: 'Entry not found' };
        
        const listing = marketplace.listings.find(l => l.id === entry.listingId);
        if (!listing) return { success: false, message: 'Listing not found' };

        if (listing.breakStatus !== BreakStatus.OPEN && listing.breakStatus !== BreakStatus.FULL_PENDING_SCHEDULE) {
            return { success: false, message: 'Cannot leave break at this stage (Locked/Live/Ended).' };
        }

        const refund = listing.price;
        const tx: WalletTransaction = {
            id: `tx_ref_${Date.now()}`,
            userId: entry.userId,
            amount: refund,
            type: TransactionType.REFUND,
            description: `Left Break: ${listing.title}`,
            balanceAfter: (currentUser?.id === entry.userId ? currentUser.walletBalance : 0) + refund,
            createdAt: new Date(),
            referenceId: listing.id
        };
        wallet.setTransactions(prev => [tx, ...prev]);
        if (currentUser?.id === entry.userId) {
            updateProfile({ walletBalance: tx.balanceAfter });
        }

        setBreakEntries(prev => prev.filter(e => e.id !== entryId));
        
        marketplace.setListings(prev => prev.map(l => {
            if (l.id === listing.id) {
                return {
                    ...l,
                    currentParticipants: Math.max(0, (l.currentParticipants || 1) - 1),
                    breakStatus: BreakStatus.OPEN
                };
            }
            return l;
        }));

        return { success: true, message: 'Removed' };
    };

    const publishLiveEvent = (listingId: string, type: LiveEventType, payload: any) => {
        const event: LiveEvent = {
            id: `evt_${Date.now()}`,
            listingId,
            type,
            payload,
            timestamp: new Date()
        };
        setLiveEvents(prev => ({
            ...prev,
            [listingId]: [...(prev[listingId] || []), event]
        }));
    };

    const addLiveChatMessage = (listingId: string, msg: LiveChatMessage) => {
        setLiveChatHistory(prev => ({
            ...prev,
            [listingId]: [...(prev[listingId] || []), msg]
        }));
    };

    const getLiveEvents = (listingId: string) => liveEvents[listingId] || [];
    const getBreakEntries = (listingId: string) => breakEntries.filter(e => e.listingId === listingId);
    
    const joinWaitlist = async (listingId: string) => {
        return { success: true, message: 'Joined waitlist' };
    };

    const getWaitlistPosition = (listingId: string) => -1;

    const getClosingBreaks = (limit: number) => {
        return marketplace.listings
          .filter(l => l.type === ListingType.TIMED_BREAK && l.breakStatus === BreakStatus.OPEN)
          .sort((a, b) => (b.currentParticipants || 0) - (a.currentParticipants || 0)) 
          .slice(0, limit);
    };

    return {
        breakEntries,
        liveEvents,
        liveChatHistory,
        joinBreak,
        scheduleBreak,
        startBreak,
        completeBreak,
        cancelBreak,
        removeBreakEntry,
        publishLiveEvent,
        addLiveChatMessage,
        getLiveEvents,
        getBreakEntries,
        joinWaitlist,
        getWaitlistPosition,
        getClosingBreaks
    };
};