
import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { 
    Listing, User, FilterState, SearchScope, SortOption, 
    AppMode, Bid, BreakEntry, WalletTransaction, Notification, 
    LiveEvent, LiveChatMessage, TcgSet, Group, Thread, Comment, Report,
    LiveEventType
} from '../types';
import { useAuth } from './AuthContext';
import { fetchTcgSets } from '../services/tcgApiService';

// Import modular stores
import { useWalletStore } from '../stores/useWalletStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useSocialStore } from '../stores/useSocialStore';
import { useMarketplaceStore } from '../stores/useMarketplaceStore';
import { useBreaksStore } from '../stores/useBreaksStore';

interface StoreContextType {
    listings: Listing[];
    filteredListings: Listing[];
    filters: FilterState;
    sortOption: SortOption;
    availableSets: TcgSet[];
    appMode: AppMode;
    loading: boolean;
    currentUser: User | null;
    
    // Transactions
    transactions: WalletTransaction[];
    
    // Breaks
    breakEntries: BreakEntry[];
    
    // Social
    groups: Group[];
    threads: Thread[];
    comments: Comment[];
    
    // Realtime
    liveEvents: Record<string, LiveEvent[]>;
    liveChatHistory: Record<string, LiveChatMessage[]>;
    notifications: Notification[];
    reports: Report[];

    // Actions
    setAppMode: (mode: AppMode) => void;
    setFilter: (key: string, value: any) => void;
    setSortOption: (option: SortOption) => void;
    resetFilters: () => void;
    getSuggestions: (scope: SearchScope, query: string) => string[];
    
    addListing: (listing: Listing) => void;
    updateListing: (id: string, updates: Partial<Listing>) => void;
    placeBid: (listingId: string, amount: number) => { success: boolean, message: string };
    buyNow: (listingId: string) => { success: boolean, message: string };
    getBidsByListingId: (listingId: string) => Bid[];
    
    // Breaks
    joinBreak: (listingId: string) => Promise<{ success: boolean, message: string }>;
    scheduleBreak: (listingId: string, date: Date, link: string) => { success: boolean, message: string };
    startBreak: (listingId: string) => void;
    completeBreak: (listingId: string, media: string[], notes: string) => void;
    cancelBreak: (listingId: string) => void;
    getBreakEntries: (listingId: string) => BreakEntry[];
    removeBreakEntry: (entryId: string) => Promise<{ success: boolean, message: string }>;
    joinWaitlist: (listingId: string) => Promise<{ success: boolean, message: string }>;
    getWaitlistPosition: (listingId: string) => number;
    getClosingBreaks: (limit: number) => Listing[];
    
    // Live
    publishLiveEvent: (listingId: string, type: LiveEventType, payload: any) => void;
    addLiveChatMessage: (listingId: string, msg: LiveChatMessage) => void;
    getLiveEvents: (listingId: string) => LiveEvent[];
    
    // Wallet
    depositFunds: (amount: number) => Promise<{ success: boolean, message: string }>;
    withdrawFunds: (amount: number) => Promise<{ success: boolean, message: string }>;
    
    // Notifications
    markNotificationRead: (id: string) => void;
    markAllNotificationsRead: () => void;
    
    // Community
    getRecommendedGroups: () => { group: Group, reason: string }[];
    joinGroup: (groupId: string) => void;
    leaveGroup: (groupId: string) => void;
    createThread: (groupId: string, title: string, body: string) => void;
    postComment: (threadId: string, body: string) => void;
    getGroupThreads: (groupId: string) => Thread[];
    getThreadComments: (threadId: string) => Comment[];
    
    // Reports
    submitReport: (entityId: string, type: 'USER' | 'LISTING' | 'THREAD' | 'COMMENT', reason: string) => void;
    dismissReport: (reportId: string) => void;
    resolveReport: (reportId: string) => void;
    
    // Queries
    getEndingSoonAuctions: (limit: number) => Listing[];
    getEndingSoonSales: (limit: number) => Listing[];
    getRelatedListings: (listing: Listing) => Listing[];
    
    // Verification
    verifySellerListings: (sellerId: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: PropsWithChildren<{}>) => {
  const { user: currentUser, updateProfile } = useAuth();
  
  // Shared State
  const [availableSets, setAvailableSets] = useState<TcgSet[]>([]);
  const [loading, setLoading] = useState(false);

  // Load Sets
  useEffect(() => {
      fetchTcgSets().then(setAvailableSets);
  }, []);

  // Initialize Modules (Order matters for dependencies)
  
  // 1. Wallet (Independent)
  const walletStore = useWalletStore(currentUser, updateProfile);

  // 2. Notifications (Independent)
  const notificationStore = useNotificationStore(currentUser);

  // 3. Social (Independent)
  const socialStore = useSocialStore(currentUser, updateProfile);

  // 4. Marketplace (Needs Wallet for Buy/Bid)
  const marketplaceStore = useMarketplaceStore(currentUser, walletStore, updateProfile, availableSets);

  // 5. Breaks (Needs Marketplace for Listings, Wallet for Funds, Notifications for Alerts)
  const breaksStore = useBreaksStore(
      currentUser, 
      marketplaceStore, 
      walletStore, 
      notificationStore, 
      updateProfile
  );

  return (
    <StoreContext.Provider value={{
        // Marketplace State & Actions
        listings: marketplaceStore.listings,
        filteredListings: marketplaceStore.filteredListings,
        filters: marketplaceStore.filters,
        sortOption: marketplaceStore.sortOption,
        appMode: marketplaceStore.appMode,
        setAppMode: marketplaceStore.setAppMode,
        setFilter: marketplaceStore.setFilter,
        setSortOption: marketplaceStore.setSortOption,
        resetFilters: marketplaceStore.resetFilters,
        getSuggestions: marketplaceStore.getSuggestions,
        addListing: marketplaceStore.addListing,
        updateListing: marketplaceStore.updateListing,
        verifySellerListings: marketplaceStore.verifySellerListings,
        placeBid: marketplaceStore.placeBid,
        buyNow: marketplaceStore.buyNow,
        getBidsByListingId: marketplaceStore.getBidsByListingId,
        getEndingSoonAuctions: marketplaceStore.getEndingSoonAuctions,
        getEndingSoonSales: marketplaceStore.getEndingSoonSales,
        getRelatedListings: marketplaceStore.getRelatedListings,

        // Breaks State & Actions
        breakEntries: breaksStore.breakEntries,
        liveEvents: breaksStore.liveEvents,
        liveChatHistory: breaksStore.liveChatHistory,
        joinBreak: breaksStore.joinBreak,
        scheduleBreak: breaksStore.scheduleBreak,
        startBreak: breaksStore.startBreak,
        completeBreak: breaksStore.completeBreak,
        cancelBreak: breaksStore.cancelBreak,
        getBreakEntries: breaksStore.getBreakEntries,
        removeBreakEntry: breaksStore.removeBreakEntry,
        joinWaitlist: breaksStore.joinWaitlist,
        getWaitlistPosition: breaksStore.getWaitlistPosition,
        getClosingBreaks: breaksStore.getClosingBreaks,
        publishLiveEvent: breaksStore.publishLiveEvent,
        addLiveChatMessage: breaksStore.addLiveChatMessage,
        getLiveEvents: breaksStore.getLiveEvents,

        // Wallet State & Actions
        transactions: walletStore.transactions,
        depositFunds: walletStore.depositFunds,
        withdrawFunds: walletStore.withdrawFunds,

        // Notification State & Actions
        notifications: notificationStore.notifications,
        reports: notificationStore.reports,
        markNotificationRead: notificationStore.markNotificationRead,
        markAllNotificationsRead: notificationStore.markAllNotificationsRead,
        submitReport: notificationStore.submitReport,
        dismissReport: notificationStore.dismissReport,
        resolveReport: notificationStore.resolveReport,

        // Social State & Actions
        groups: socialStore.groups,
        threads: socialStore.threads,
        comments: socialStore.comments,
        getRecommendedGroups: socialStore.getRecommendedGroups,
        joinGroup: socialStore.joinGroup,
        leaveGroup: socialStore.leaveGroup,
        createThread: socialStore.createThread,
        postComment: socialStore.postComment,
        getGroupThreads: socialStore.getGroupThreads,
        getThreadComments: socialStore.getThreadComments,

        // Shared / Base
        availableSets,
        loading,
        currentUser
    }}>
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
