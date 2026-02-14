
import React, { createContext, useContext, useState, useEffect, useMemo, PropsWithChildren } from 'react';
import {
  Listing, ListingType, User, Bid, Notification, Group, Thread, Comment,
  BreakStatus, AppMode, SearchScope, SortOption, FilterState,
  Report, LiveEvent, LiveChatMessage, BreakEntry, TcgSet,
  TransactionType, WalletTransaction, LiveEventType, BreakEntryStatus
} from '../types';
import { useAuth } from './AuthContext';
import { INITIAL_LISTINGS, INITIAL_GROUPS, INITIAL_THREADS, INITIAL_COMMENTS, MOCK_TRANSACTIONS, MOCK_REPORTS } from '../constants';
import { fetchTcgSets } from '../services/tcgApiService';

interface StoreContextType {
  // Data
  listings: Listing[];
  filteredListings: Listing[];
  groups: Group[];
  threads: Thread[];
  notifications: Notification[];
  transactions: WalletTransaction[];
  availableSets: TcgSet[];
  reports: Report[];
  
  // User
  currentUser: User | null;
  loading: boolean;
  
  // App State
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  filters: any; // Define properly if possible
  setFilter: (key: string, value: any) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  resetFilters: () => void;

  // Actions
  addListing: (listing: Partial<Listing>) => void;
  updateListing: (id: string, updates: Partial<Listing>) => void;
  placeBid: (listingId: string, amount: number) => { success: boolean; message: string };
  buyNow: (listingId: string) => { success: boolean; message: string };
  joinBreak: (listingId: string) => Promise<{ success: boolean; message: string }>;
  
  // Getters
  getBidsByListingId: (listingId: string) => Bid[];
  getBreakEntries: (listingId: string) => BreakEntry[];
  getLiveEvents: (listingId: string) => LiveEvent[];
  getGroupThreads: (groupId: string) => Thread[];
  getThreadComments: (threadId: string) => Comment[];
  getRecommendedGroups: () => { group: Group; reason: string }[];
  getEndingSoonAuctions: (limit: number) => Listing[];
  getClosingBreaks: (limit: number) => Listing[];
  getRelatedListings: (listing: Listing) => Listing[];
  getSuggestions: (scope: SearchScope, query: string) => string[];
  getWaitlistPosition: (listingId: string) => number;

  // Live / Breaks
  liveChatHistory: Record<string, LiveChatMessage[]>;
  addLiveChatMessage: (listingId: string, message: LiveChatMessage) => void;
  publishLiveEvent: (listingId: string, type: LiveEventType, payload: any) => void;
  scheduleBreak: (listingId: string, date: Date, link: string) => { success: boolean; message: string };
  startBreak: (listingId: string) => void;
  completeBreak: (listingId: string, media: string[], notes: string) => void;
  cancelBreak: (listingId: string) => void;
  removeBreakEntry: (entryId: string) => Promise<{ success: boolean; message: string }>;
  joinWaitlist: (listingId: string) => Promise<{ success: boolean; message: string }>;

  // Community
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  createThread: (groupId: string, title: string, body: string) => void;
  postComment: (threadId: string, body: string) => void;

  // Wallet / Notifications
  depositFunds: (amount: number) => Promise<{ success: boolean; message: string }>;
  withdrawFunds: (amount: number) => Promise<{ success: boolean; message: string }>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Moderation
  dismissReport: (id: string) => void;
  resolveReport: (id: string) => void;
  submitReport: (entityId: string, entityType: 'USER' | 'LISTING' | 'THREAD' | 'COMMENT', reason: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: PropsWithChildren<{}>) => {
  const { user: currentUser, updateProfile } = useAuth();
  
  // State
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [bids, setBids] = useState<Bid[]>([]);
  const [breakEntries, setBreakEntries] = useState<BreakEntry[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [liveChatHistory, setLiveChatHistory] = useState<Record<string, LiveChatMessage[]>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(MOCK_TRANSACTIONS);
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [availableSets, setAvailableSets] = useState<TcgSet[]>([]);
  const [loading, setLoading] = useState(false);

  // App State
  const [appMode, setAppMode] = useState<AppMode>(AppMode.COMBINED);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.NEWEST);
  const [filters, setFilters] = useState<any>({
      searchQuery: '',
      searchScope: SearchScope.ALL,
      priceRange: { min: null, max: null },
      pokemonTypes: [],
      cardCategories: [],
      variantTags: [],
      condition: [],
      gradingCompany: [],
      sealedProductType: [],
      breakStatus: [],
      pokemonName: '',
      language: '',
      series: '',
      set: ''
  });

  // Load Sets
  useEffect(() => {
      fetchTcgSets().then(setAvailableSets);
  }, []);

  // Filter Logic
  const filteredListings = useMemo(() => {
      let result = listings;

      // App Mode Filter
      if (appMode === AppMode.MARKETPLACE) {
          result = result.filter(l => l.type !== ListingType.TIMED_BREAK);
      } else if (appMode === AppMode.BREAKS) {
          result = result.filter(l => l.type === ListingType.TIMED_BREAK);
      }

      // Search
      if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          result = result.filter(l => {
              if (filters.searchScope === SearchScope.TITLE) return l.title.toLowerCase().includes(q);
              if (filters.searchScope === SearchScope.POKEMON) return l.pokemonName?.toLowerCase().includes(q);
              if (filters.searchScope === SearchScope.SET) return l.setName?.toLowerCase().includes(q) || l.series?.toLowerCase().includes(q);
              if (filters.searchScope === SearchScope.SELLER) return l.sellerName.toLowerCase().includes(q);
              if (filters.searchScope === SearchScope.BOOSTER) return l.boosterName?.toLowerCase().includes(q);
              
              // ALL
              return l.title.toLowerCase().includes(q) || 
                     l.pokemonName?.toLowerCase().includes(q) || 
                     l.setName?.toLowerCase().includes(q) ||
                     l.description.toLowerCase().includes(q) ||
                     l.sellerName.toLowerCase().includes(q);
          });
      }

      // Specific Filters
      if (filters.pokemonName) result = result.filter(l => l.pokemonName?.toLowerCase().includes(filters.pokemonName.toLowerCase()));
      if (filters.language) result = result.filter(l => l.language === filters.language);
      if (filters.series) result = result.filter(l => l.series === filters.series);
      if (filters.set) result = result.filter(l => l.setId === filters.set);
      
      if (filters.pokemonTypes.length > 0) result = result.filter(l => l.pokemonType && filters.pokemonTypes.includes(l.pokemonType));
      if (filters.cardCategories.length > 0) result = result.filter(l => l.cardCategory && filters.cardCategories.includes(l.cardCategory));
      
      if (filters.variantTags.length > 0) {
          result = result.filter(l => l.variantTags && filters.variantTags.some((t: any) => l.variantTags?.includes(t)));
      }

      if (filters.condition.length > 0) result = result.filter(l => l.condition && filters.condition.includes(l.condition));
      if (filters.gradingCompany.length > 0) result = result.filter(l => l.gradingCompany && filters.gradingCompany.includes(l.gradingCompany));
      if (filters.sealedProductType.length > 0) result = result.filter(l => l.sealedProductType && filters.sealedProductType.includes(l.sealedProductType));
      if (filters.breakStatus.length > 0) result = result.filter(l => l.breakStatus && filters.breakStatus.includes(l.breakStatus));

      if (filters.priceRange.min !== null) result = result.filter(l => l.price >= filters.priceRange.min);
      if (filters.priceRange.max !== null) result = result.filter(l => l.price <= filters.priceRange.max);

      // Sort
      return result.sort((a, b) => {
          switch (sortOption) {
              case SortOption.PRICE_ASC: return a.price - b.price;
              case SortOption.PRICE_DESC: return b.price - a.price;
              case SortOption.ENDING_SOON: 
                  const aTime = a.endsAt || a.closesAt || new Date(8640000000000000);
                  const bTime = b.endsAt || b.closesAt || new Date(8640000000000000);
                  return new Date(aTime).getTime() - new Date(bTime).getTime();
              case SortOption.MOST_BIDS: return b.bidsCount - a.bidsCount;
              case SortOption.NEWEST: default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
      });
  }, [listings, appMode, filters, sortOption]);

  const setFilter = (key: string, value: any) => {
      setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
      setFilters({
          searchQuery: '',
          searchScope: SearchScope.ALL,
          priceRange: { min: null, max: null },
          pokemonTypes: [],
          cardCategories: [],
          variantTags: [],
          condition: [],
          gradingCompany: [],
          sealedProductType: [],
          breakStatus: [],
          pokemonName: '',
          language: '',
          series: '',
          set: ''
      });
  };

  // --- Actions ---

  const addListing = (listing: Partial<Listing>) => {
      if (!currentUser) return;
      const newListing: Listing = {
          ...listing,
          id: `l_${Date.now()}`,
          sellerId: currentUser.id,
          sellerName: currentUser.displayName || currentUser.name,
          sellerAvatar: currentUser.avatarUrl,
          sellerVerified: currentUser.isVerifiedSeller,
          createdAt: new Date(),
          bidsCount: 0,
          currentBid: 0,
          isSold: false
      } as Listing;
      setListings(prev => [newListing, ...prev]);
  };

  const updateListing = (id: string, updates: Partial<Listing>) => {
      setListings(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const placeBid = (listingId: string, amount: number) => {
      if (!currentUser) return { success: false, message: 'Login required' };
      const listing = listings.find(l => l.id === listingId);
      if (!listing) return { success: false, message: 'Listing not found' };
      
      if (amount <= listing.currentBid) return { success: false, message: 'Bid too low' };
      if (currentUser.walletBalance < amount) return { success: false, message: 'Insufficient funds' };

      const bid: Bid = {
          id: `b_${Date.now()}`,
          listingId,
          bidderId: currentUser.id,
          bidderName: currentUser.displayName || currentUser.name,
          amount,
          createdAt: new Date()
      };

      setBids(prev => [bid, ...prev]);
      updateListing(listingId, { currentBid: amount, bidsCount: listing.bidsCount + 1, highBidderId: currentUser.id });
      
      // Notify (mock)
      setNotifications(prev => [{
          id: `n_${Date.now()}`,
          userId: listing.sellerId,
          type: 'BID_WON', // Misnomer for new bid
          title: 'New Bid Received',
          message: `${currentUser.name} bid $${amount} on ${listing.title}`,
          isRead: false,
          createdAt: new Date(),
          linkTo: listingId
      }, ...prev]);

      return { success: true, message: 'Bid placed successfully' };
  };

  const buyNow = (listingId: string) => {
      if (!currentUser) return { success: false, message: 'Login required' };
      const listing = listings.find(l => l.id === listingId);
      if (!listing) return { success: false, message: 'Listing not found' };
      
      if (currentUser.walletBalance < listing.price) return { success: false, message: 'Insufficient funds' };

      // Process Transaction
      const tx: WalletTransaction = {
          id: `tx_${Date.now()}`,
          userId: currentUser.id,
          amount: -listing.price,
          type: TransactionType.PURCHASE,
          description: `Bought ${listing.title}`,
          balanceAfter: currentUser.walletBalance - listing.price,
          createdAt: new Date(),
          referenceId: listingId,
          referenceType: 'LISTING'
      };
      setTransactions(prev => [tx, ...prev]);
      
      // Update User Wallet
      updateProfile({ walletBalance: currentUser.walletBalance - listing.price });

      updateListing(listingId, { isSold: true });
      
      return { success: true, message: 'Item purchased!' };
  };

  const joinBreak = async (listingId: string) => {
      if (!currentUser) return { success: false, message: 'Login required' };
      const listing = listings.find(l => l.id === listingId);
      if (!listing) return { success: false, message: 'Not found' };

      // Check capacity
      if ((listing.currentParticipants || 0) >= (listing.targetParticipants || 0)) {
          return { success: false, message: 'Break is full' };
      }

      const entry: BreakEntry = {
          id: `be_${Date.now()}`,
          listingId,
          userId: currentUser.id,
          userName: currentUser.displayName || currentUser.name,
          userAvatar: currentUser.avatarUrl,
          joinedAt: new Date(),
          status: BreakEntryStatus.AUTHORIZED
      };

      setBreakEntries(prev => [...prev, entry]);
      
      const newCount = (listing.currentParticipants || 0) + 1;
      let newStatus = listing.breakStatus;
      if (newCount >= (listing.targetParticipants || 0)) {
          newStatus = BreakStatus.FULL_PENDING_SCHEDULE;
      }

      updateListing(listingId, { currentParticipants: newCount, breakStatus: newStatus });
      return { success: true, message: 'Joined break!' };
  };

  // --- Getters ---
  const getBidsByListingId = (id: string) => bids.filter(b => b.listingId === id).sort((a,b) => b.amount - a.amount);
  const getBreakEntries = (id: string) => breakEntries.filter(b => b.listingId === id);
  const getLiveEvents = (id: string) => liveEvents.filter(e => e.breakId === id).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  const getGroupThreads = (gid: string) => threads.filter(t => t.groupId === gid).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const getThreadComments = (tid: string) => comments.filter(c => c.threadId === tid).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const getRecommendedGroups = () => {
      // Simple mock logic
      return groups.slice(0, 3).map(g => ({ group: g, reason: 'Popular now' }));
  };

  const getEndingSoonAuctions = (limit: number) => {
      return listings
        .filter(l => l.type === ListingType.AUCTION && !l.isSold)
        .sort((a, b) => new Date(a.endsAt || 0).getTime() - new Date(b.endsAt || 0).getTime())
        .slice(0, limit);
  };

  const getClosingBreaks = (limit: number) => {
      return listings
        .filter(l => l.type === ListingType.TIMED_BREAK && (l.breakStatus === BreakStatus.OPEN || l.breakStatus === BreakStatus.SCHEDULED))
        .sort((a,b) => (a.currentParticipants || 0) - (b.currentParticipants || 0)) // Sort by fill rate? Maybe reverse
        .slice(0, limit);
  };

  const getRelatedListings = (listing: Listing) => {
      return listings
        .filter(l => l.id !== listing.id && (l.setId === listing.setId || l.pokemonName === listing.pokemonName))
        .slice(0, 4);
  };

  const getSuggestions = (scope: SearchScope, query: string) => {
      const q = query.toLowerCase();
      const candidates = new Set<string>();
      listings.forEach(l => {
          if (l.title.toLowerCase().includes(q)) candidates.add(l.title);
          if (l.pokemonName?.toLowerCase().includes(q)) candidates.add(l.pokemonName);
      });
      return Array.from(candidates).slice(0, 5);
  };

  const getWaitlistPosition = (listingId: string) => -1; // Mock

  // --- Live Features ---
  const addLiveChatMessage = (listingId: string, message: LiveChatMessage) => {
      setLiveChatHistory(prev => ({
          ...prev,
          [listingId]: [...(prev[listingId] || []), message]
      }));
  };

  const publishLiveEvent = (listingId: string, type: LiveEventType, payload: any) => {
      const event: LiveEvent = {
          id: `ev_${Date.now()}`,
          breakId: listingId,
          type,
          payload,
          createdAt: new Date()
      };
      setLiveEvents(prev => [...prev, event]);
  };

  const scheduleBreak = (listingId: string, date: Date, link: string) => {
      updateListing(listingId, { breakStatus: BreakStatus.SCHEDULED, scheduledLiveAt: date, liveLink: link });
      return { success: true, message: 'Break scheduled' };
  };

  const startBreak = (listingId: string) => {
      updateListing(listingId, { breakStatus: BreakStatus.LIVE, liveStartedAt: new Date() });
      publishLiveEvent(listingId, LiveEventType.BREAK_START, { message: 'Stream started' });
  };

  const completeBreak = (listingId: string, media: string[], notes: string) => {
      updateListing(listingId, { breakStatus: BreakStatus.COMPLETED, liveEndedAt: new Date(), resultsMedia: media, resultsNotes: notes });
      publishLiveEvent(listingId, LiveEventType.BREAK_END, { message: 'Break completed' });
  };

  const cancelBreak = (listingId: string) => {
      updateListing(listingId, { breakStatus: BreakStatus.CANCELLED });
  };

  const removeBreakEntry = async (entryId: string) => {
      setBreakEntries(prev => prev.filter(e => e.id !== entryId));
      return { success: true, message: 'Removed' };
  };

  const joinWaitlist = async (listingId: string) => {
      return { success: true, message: 'Joined waitlist' };
  };

  // --- Community ---
  const joinGroup = (groupId: string) => {
      if (!currentUser) return;
      const ids = currentUser.joinedGroupIds || [];
      if (!ids.includes(groupId)) {
          updateProfile({ joinedGroupIds: [...ids, groupId] });
      }
  };

  const leaveGroup = (groupId: string) => {
      if (!currentUser) return;
      const ids = currentUser.joinedGroupIds || [];
      updateProfile({ joinedGroupIds: ids.filter(id => id !== groupId) });
  };

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
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, commentCount: t.commentCount + 1, updatedAt: new Date() } : t));
  };

  // --- Wallet / Notifications ---
  const depositFunds = async (amount: number) => {
      if (!currentUser) return { success: false, message: 'User not found' };
      const tx: WalletTransaction = {
          id: `tx_${Date.now()}`,
          userId: currentUser.id,
          amount,
          type: TransactionType.DEPOSIT,
          description: 'Funds Added',
          balanceAfter: currentUser.walletBalance + amount,
          createdAt: new Date()
      };
      setTransactions(prev => [tx, ...prev]);
      updateProfile({ walletBalance: currentUser.walletBalance + amount });
      return { success: true, message: 'Funds deposited' };
  };

  const withdrawFunds = async (amount: number) => {
      if (!currentUser) return { success: false, message: 'User not found' };
      if (currentUser.walletBalance < amount) return { success: false, message: 'Insufficient funds' };
      
      const tx: WalletTransaction = {
          id: `tx_${Date.now()}`,
          userId: currentUser.id,
          amount: -amount,
          type: TransactionType.WITHDRAWAL,
          description: 'Withdrawal',
          balanceAfter: currentUser.walletBalance - amount,
          createdAt: new Date()
      };
      setTransactions(prev => [tx, ...prev]);
      updateProfile({ walletBalance: currentUser.walletBalance - amount });
      return { success: true, message: 'Funds withdrawn' };
  };

  const markNotificationRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // --- Moderation ---
  const dismissReport = (id: string) => {
      setReports(prev => prev.filter(r => r.id !== id));
  };

  const resolveReport = (id: string) => {
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'RESOLVED' } : r));
  };

  const submitReport = (entityId: string, entityType: 'USER' | 'LISTING' | 'THREAD' | 'COMMENT', reason: string) => {
      if (!currentUser) return;
      const report: Report = {
          id: `r_${Date.now()}`,
          reporterId: currentUser.id,
          reporterName: currentUser.displayName || currentUser.name,
          reportedEntityId: entityId,
          entityType,
          reason,
          status: 'PENDING',
          createdAt: new Date()
      };
      setReports(prev => [report, ...prev]);
  };

  return (
    <StoreContext.Provider value={{
        listings, filteredListings, groups, threads, notifications, transactions, availableSets, reports,
        currentUser, loading,
        appMode, setAppMode, filters, setFilter, sortOption, setSortOption, resetFilters,
        addListing, updateListing, placeBid, buyNow, joinBreak,
        getBidsByListingId, getBreakEntries, getLiveEvents, getGroupThreads, getThreadComments,
        getRecommendedGroups, getEndingSoonAuctions, getClosingBreaks, getRelatedListings, getSuggestions, getWaitlistPosition,
        liveChatHistory, addLiveChatMessage, publishLiveEvent, scheduleBreak, startBreak, completeBreak, cancelBreak, removeBreakEntry, joinWaitlist,
        joinGroup, leaveGroup, createThread, postComment,
        depositFunds, withdrawFunds, markNotificationRead, markAllNotificationsRead,
        dismissReport, resolveReport, submitReport
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
