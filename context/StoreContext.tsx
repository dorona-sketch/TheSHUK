
import React, { createContext, useContext, useState, useEffect, PropsWithChildren, useMemo } from 'react';
import { Listing, User, ListingType, Condition, TcgSet, SortOption, ProductCategory, GradingCompany, SealedProductType, Bid, PokemonType, CardCategory, VariantTag, BreakStatus, BreakEntry, AppMode, BreakEntryStatus, Notification, SearchScope, PaymentIntent, WalletTransaction, PaymentStatus, TransactionType, LiveEvent, LiveEventType, WaitlistEntry, Group, Thread, Comment, LiveChatMessage } from '../types';
import { INITIAL_LISTINGS, MOCK_PAYMENT_INTENTS, MOCK_TRANSACTIONS, INITIAL_GROUPS, INITIAL_THREADS, INITIAL_COMMENTS } from '../constants';
import { fetchTcgSets } from '../services/tcgApiService';
import { useAuth } from './AuthContext';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { parseDate } from '../utils/dateUtils';

const DB_VERSION = 'v3';
const KEYS = {
    LISTINGS: `pv_listings_${DB_VERSION}`,
    BIDS: `pv_bids_${DB_VERSION}`,
};

interface FilterState {
  searchQuery: string;
  searchScope: SearchScope;
  category: ProductCategory; 
  series: string;
  set: string;
  language: string;
  condition: Condition[]; 
  gradingCompany: GradingCompany[]; 
  grade: string; 
  sealedProductType: SealedProductType[];
  pokemonTypes: PokemonType[];
  cardCategories: CardCategory[];
  variantTags: VariantTag[];
  breakStatus: BreakStatus[];
  priceRange: { min: number | null; max: number | null };
  pokemonName: string;
}

interface StoreContextType {
  listings: Listing[];
  marketListings: Listing[];
  breakListings: Listing[];
  filteredListings: Listing[];
  currentUser: User | null;
  notifications: Notification[];
  availableSets: TcgSet[];
  filters: FilterState;
  sortOption: SortOption;
  loading: boolean;
  appMode: AppMode;
  
  paymentIntents: PaymentIntent[];
  transactions: WalletTransaction[];
  liveEvents: LiveEvent[];
  liveChatHistory: Record<string, LiveChatMessage[]>; 
  waitlist: WaitlistEntry[];
  groups: Group[];
  threads: Thread[];
  comments: Comment[];
  
  setFilter: (key: keyof FilterState, value: any) => void;
  resetFilters: () => void;
  setSortOption: (option: SortOption) => void;
  setAppMode: (mode: AppMode) => void;
  
  addListing: (listingData: any) => void;
  updateListing: (id: string, updates: Partial<Listing>) => void;
  placeBid: (listingId: string, amount: number) => { success: boolean; message: string };
  buyNow: (listingId: string) => { success: boolean; message: string };
  
  joinBreak: (listingId: string) => Promise<{ success: boolean; message: string }>;
  getBreakEntries: (listingId: string) => BreakEntry[];
  scheduleBreak: (listingId: string, date: Date, link?: string) => { success: boolean; message: string };
  startBreak: (listingId: string) => { success: boolean; message: string };
  completeBreak: (listingId: string, media: string[], notes: string) => { success: boolean; message: string };
  cancelBreak: (listingId: string) => { success: boolean; message: string };
  removeBreakEntry: (entryId: string) => Promise<{ success: boolean; message: string }>;
  
  getLiveEvents: (listingId: string) => LiveEvent[];
  publishLiveEvent: (listingId: string, type: LiveEventType, payload: any) => void;
  addLiveChatMessage: (listingId: string, message: LiveChatMessage) => void;

  joinWaitlist: (listingId: string) => Promise<{ success: boolean; message: string }>;

  getBidsByListingId: (listingId: string) => Bid[];
  getRelatedListings: (listing: Listing) => Listing[];
  getEndingSoonAuctions: (limit: number) => Listing[];
  getClosingBreaks: (limit: number) => Listing[];
  getSuggestions: (scope: SearchScope, query: string) => string[];

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  depositFunds: (amount: number) => Promise<{ success: boolean; message: string }>;
  withdrawFunds: (amount: number) => Promise<{ success: boolean; message: string }>;

  getRecommendedGroups: () => { group: Group, reason: string }[];
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  getGroupThreads: (groupId: string) => Thread[];
  createThread: (groupId: string, title: string, body: string, images?: string[]) => void;
  getThreadComments: (threadId: string) => Comment[];
  postComment: (threadId: string, body: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: PropsWithChildren<{}>) => {
  const { user: currentUser, updateProfile } = useAuth();
  
  // Persisted States
  const [listings, setListings] = useState<Listing[]>(() => loadFromStorage(KEYS.LISTINGS, INITIAL_LISTINGS));
  const [bids, setBids] = useState<Bid[]>(() => loadFromStorage(KEYS.BIDS, []));
  const [breakEntries, setBreakEntries] = useState<BreakEntry[]>(() => loadFromStorage('pv_break_entries', []));
  const [notifications, setNotifications] = useState<Notification[]>(() => loadFromStorage('pv_notifications', []));
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => loadFromStorage('pv_transactions', MOCK_TRANSACTIONS));
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntent[]>(() => loadFromStorage('pv_payment_intents', MOCK_PAYMENT_INTENTS));
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>(() => loadFromStorage('pv_live_events', []));
  const [liveChatHistory, setLiveChatHistory] = useState<Record<string, LiveChatMessage[]>>(() => loadFromStorage('pv_live_chat', {}));
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => loadFromStorage('pv_waitlist', []));
  const [groups, setGroups] = useState<Group[]>(() => loadFromStorage('pv_groups', INITIAL_GROUPS));
  const [threads, setThreads] = useState<Thread[]>(() => loadFromStorage('pv_threads', INITIAL_THREADS));
  const [comments, setComments] = useState<Comment[]>(() => loadFromStorage('pv_comments', INITIAL_COMMENTS));

  const [availableSets, setAvailableSets] = useState<TcgSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>(AppMode.MARKETPLACE);
  
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    searchScope: SearchScope.ALL,
    category: ProductCategory.RAW_CARD,
    series: '',
    set: '',
    language: '',
    condition: [],
    gradingCompany: [],
    grade: '',
    sealedProductType: [],
    pokemonTypes: [],
    cardCategories: [],
    variantTags: [],
    breakStatus: [],
    priceRange: { min: null, max: null },
    pokemonName: ''
  });
  
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.NEWEST);

  // --- Persistence Effects ---
  useEffect(() => saveToStorage(KEYS.LISTINGS, listings), [listings]);
  useEffect(() => saveToStorage(KEYS.BIDS, bids), [bids]);
  useEffect(() => saveToStorage('pv_break_entries', breakEntries), [breakEntries]);
  useEffect(() => saveToStorage('pv_notifications', notifications), [notifications]);
  useEffect(() => saveToStorage('pv_transactions', transactions), [transactions]);
  useEffect(() => saveToStorage('pv_payment_intents', paymentIntents), [paymentIntents]);
  useEffect(() => saveToStorage('pv_live_events', liveEvents), [liveEvents]);
  useEffect(() => saveToStorage('pv_live_chat', liveChatHistory), [liveChatHistory]);
  useEffect(() => saveToStorage('pv_waitlist', waitlist), [waitlist]);
  useEffect(() => saveToStorage('pv_groups', groups), [groups]);
  useEffect(() => saveToStorage('pv_threads', threads), [threads]);
  useEffect(() => saveToStorage('pv_comments', comments), [comments]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sets = await fetchTcgSets();
        setAvailableSets(sets);
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const marketListings = useMemo(() => listings.filter(l => l.type !== ListingType.TIMED_BREAK), [listings]);
  const breakListings = useMemo(() => listings.filter(l => l.type === ListingType.TIMED_BREAK), [listings]);

  // --- Core Filter Logic ---
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
        // 1. App Mode Filter
        if (appMode === AppMode.MARKETPLACE && l.type === ListingType.TIMED_BREAK) return false;
        if (appMode === AppMode.BREAKS && l.type !== ListingType.TIMED_BREAK) return false;

        // 2. Search Query
        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            const scope = filters.searchScope;
            let match = false;
            
            const check = (val?: string) => val?.toLowerCase().includes(q);

            if (scope === SearchScope.ALL) {
                match = check(l.title) || check(l.pokemonName) || check(l.setName) || check(l.sellerName);
            } else if (scope === SearchScope.TITLE) match = check(l.title);
            else if (scope === SearchScope.POKEMON) match = check(l.pokemonName);
            else if (scope === SearchScope.SET) match = check(l.setName);
            else if (scope === SearchScope.SELLER) match = check(l.sellerName);
            else if (scope === SearchScope.BOOSTER) match = check(l.boosterName);
            
            if (!match) return false;
        }

        // 3. Category Filter
        if (appMode !== AppMode.BREAKS && filters.category && l.category !== filters.category) return false;

        // 4. Advanced Filters
        if (filters.pokemonName) {
            const pName = filters.pokemonName.toLowerCase();
            if (!l.pokemonName?.toLowerCase().includes(pName)) return false;
        }

        if (filters.series && l.series !== filters.series) return false;
        if (filters.set && l.setId !== filters.set) return false;
        if (filters.language && l.language !== filters.language) return false;

        if (filters.pokemonTypes.length > 0 && (!l.pokemonType || !filters.pokemonTypes.includes(l.pokemonType))) return false;
        if (filters.cardCategories.length > 0 && (!l.cardCategory || !filters.cardCategories.includes(l.cardCategory))) return false;
        
        if (filters.variantTags.length > 0) {
            if (!l.variantTags || !l.variantTags.some(tag => filters.variantTags.includes(tag))) return false;
        }

        if (filters.condition.length > 0 && (!l.condition || !filters.condition.includes(l.condition))) return false;
        if (filters.gradingCompany.length > 0 && (!l.gradingCompany || !filters.gradingCompany.includes(l.gradingCompany))) return false;
        if (filters.sealedProductType.length > 0 && (!l.sealedProductType || !filters.sealedProductType.includes(l.sealedProductType))) return false;

        // Break Status
        if (filters.breakStatus.length > 0 && l.type === ListingType.TIMED_BREAK) {
            if (!l.breakStatus || !filters.breakStatus.includes(l.breakStatus)) return false;
        }

        // Price Range
        const price = l.type === ListingType.AUCTION ? (l.currentBid || l.price) : l.price;
        if (filters.priceRange.min !== null && price < filters.priceRange.min) return false;
        if (filters.priceRange.max !== null && price > filters.priceRange.max) return false;

        return true;
    }).sort((a, b) => {
        switch (sortOption) {
            case SortOption.NEWEST: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case SortOption.PRICE_ASC: return (a.currentBid || a.price) - (b.currentBid || b.price);
            case SortOption.PRICE_DESC: return (b.currentBid || b.price) - (a.currentBid || a.price);
            case SortOption.MOST_BIDS: return (b.bidsCount || 0) - (a.bidsCount || 0);
            case SortOption.ENDING_SOON: 
                const endA = a.endsAt || a.closesAt || new Date(8640000000000000);
                const endB = b.endsAt || b.closesAt || new Date(8640000000000000);
                return new Date(endA).getTime() - new Date(endB).getTime();
            default: return 0;
        }
    });
  }, [listings, filters, appMode, sortOption]);

  const setFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
        searchQuery: '',
        searchScope: SearchScope.ALL,
        category: ProductCategory.RAW_CARD,
        series: '',
        set: '',
        language: '',
        condition: [],
        gradingCompany: [],
        grade: '',
        sealedProductType: [],
        pokemonTypes: [],
        cardCategories: [],
        variantTags: [],
        breakStatus: [],
        priceRange: { min: null, max: null },
        pokemonName: ''
    });
  };

  const getSuggestions = (scope: SearchScope, query: string): string[] => {
      const q = query.toLowerCase();
      const candidates = new Set<string>();
      
      const add = (val?: string) => {
          if (val && val.toLowerCase().includes(q) && candidates.size < 10) candidates.add(val);
      };

      listings.forEach(l => {
          if (scope === SearchScope.ALL || scope === SearchScope.TITLE) add(l.title);
          if (scope === SearchScope.ALL || scope === SearchScope.POKEMON) add(l.pokemonName);
          if (scope === SearchScope.ALL || scope === SearchScope.SET) add(l.setName);
      });
      return Array.from(candidates);
  };

  // ... (Rest of StoreContext methods: getRecommendedGroups, addListing, etc. - mostly unchanged)
  // To keep payload small, including only changed parts for XML but ensuring file integrity.
  // Actually, I need to include the rest of the component to be safe as per instructions.
  
  const getRecommendedGroups = () => {
      if (!currentUser || !currentUser.interests) return [];
      const recs: { group: Group, reason: string }[] = [];
      const userInterests = currentUser.interests;

      groups.forEach(g => {
          if (currentUser.joinedGroupIds?.includes(g.id)) return;
          
          let reason = '';
          if (g.matchRules?.pokemonNames?.some(p => userInterests.pokemon?.includes(p))) {
              reason = 'Matches your Pokemon interests';
          } else if (g.matchRules?.setNames?.some(s => userInterests.sets?.includes(s))) {
              reason = 'Matches your Set interests';
          }

          if (reason) recs.push({ group: g, reason });
      });
      return recs;
  };

  const addListing = (listingData: any) => {
      const newListing: Listing = {
          ...listingData,
          id: `l_${Date.now()}`,
          sellerId: currentUser?.id || 'unknown',
          sellerName: currentUser?.name || 'Unknown',
          sellerAvatar: currentUser?.avatar || '',
          sellerVerified: currentUser?.isVerifiedSeller,
          createdAt: new Date(),
          bidsCount: 0,
          currentBid: 0,
          breakStatus: listingData.type === ListingType.TIMED_BREAK ? BreakStatus.OPEN : undefined,
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
      if (endDate && new Date() > endDate) {
          return { success: false, message: 'Auction has ended' };
      }

      // Amount Validation
      if (isNaN(amount)) return { success: false, message: 'Invalid amount' };

      const currentHighest = listing.currentBid || 0;
      const startPrice = listing.price || 0;
      
      if (currentHighest > 0) {
          if (amount <= currentHighest) {
              return { success: false, message: `Bid must be higher than current bid ($${currentHighest.toLocaleString()})` };
          }
      } else {
          if (amount < startPrice) {
              return { success: false, message: `Bid must be at least starting price ($${startPrice.toLocaleString()})` };
          }
      }

      const newBid: Bid = {
          id: `b_${Date.now()}`,
          listingId,
          bidderId: currentUser.id,
          bidderName: currentUser.name,
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

      if (listing.highBidderId && listing.highBidderId !== currentUser.id) {
          const outbidNotif: Notification = {
              id: `n_outbid_${Date.now()}`,
              userId: listing.highBidderId,
              type: 'SYSTEM',
              title: 'Outbid!',
              message: `New high bid of $${amount} on ${listing.title}.`,
              isRead: false,
              createdAt: new Date(),
              linkTo: listing.id
          };
          setNotifications(prev => [outbidNotif, ...prev]);
      }
      return { success: true, message: 'Bid placed successfully!' };
  };

  const buyNow = (listingId: string) => {
      const listing = listings.find(l => l.id === listingId);
      if (listing && listing.sellerId === currentUser?.id) return { success: false, message: 'Cannot buy your own listing' };
      updateListing(listingId, { isSold: true });
      return { success: true, message: 'Item purchased!' };
  };

  // --- Breaks Logic (FIXED) ---
  const joinBreak = async (listingId: string) => {
      if (!currentUser) return { success: false, message: 'Please login to join.' };
      
      // Simulate network processing
      await new Promise(r => setTimeout(r, 600));

      const existingListing = listings.find(l => l.id === listingId);
      if (!existingListing) return { success: false, message: 'Listing not found' };

      // Validation
      const currentListingEntries = breakEntries.filter(e => e.listingId === listingId && e.status !== BreakEntryStatus.CANCELLED);
      const userEntries = currentListingEntries.filter(e => e.userId === currentUser.id);

      if (existingListing.closesAt) {
          const closeDate = new Date(existingListing.closesAt);
          if (new Date() > closeDate) return { success: false, message: 'Break entry period has ended.' };
      }

      if (existingListing.maxEntriesPerUser && userEntries.length >= existingListing.maxEntriesPerUser) {
          return { success: false, message: `Max entries (${existingListing.maxEntriesPerUser}) reached per user.` };
      }

      if (existingListing.type !== ListingType.TIMED_BREAK) return { success: false, message: 'Not a break listing' };
      if (existingListing.breakStatus !== BreakStatus.OPEN) return { success: false, message: 'Break is not open' };
      if (existingListing.sellerId === currentUser.id) return { success: false, message: 'Cannot join your own break' };

      const currentCount = existingListing.currentParticipants || 0;
      const target = existingListing.targetParticipants || 1;

      if (currentCount >= target) return { success: false, message: 'Break is already full' };

      // Calculate Next State
      const nextCount = currentCount + 1;
      let nextStatus = existingListing.breakStatus;
      if (nextCount >= target) {
          nextStatus = BreakStatus.FULL_PENDING_SCHEDULE;
      }

      const updatedListing = { 
          ...existingListing, 
          currentParticipants: nextCount, 
          breakStatus: nextStatus 
      };

      // Atomic State Update
      setListings(prev => prev.map(l => l.id === listingId ? updatedListing : l));

      // Proceed with Logic using updatedListing state
      const now = new Date();
      const authWindowMs = 7 * 24 * 60 * 60 * 1000; 
      const isFull = updatedListing.breakStatus === BreakStatus.FULL_PENDING_SCHEDULE;

      const newEntry: BreakEntry = {
          id: `be_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          listingId,
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          joinedAt: now,
          status: isFull ? BreakEntryStatus.CHARGED : BreakEntryStatus.AUTHORIZED, // Charge immediately if filling
          authorizedAt: now,
          authorizationExpiresAt: new Date(now.getTime() + authWindowMs),
          paymentIntentId: `pi_mock_${Date.now()}_auth`,
          chargedAt: isFull ? now : undefined
      };

      let finalEntries = [...breakEntries, newEntry];
      let finalTransactions = [...transactions];

      // CHARGE ON THRESHOLD
      if (isFull) {
          // Identify entries to charge (all existing ACTIVE entries + new entry)
          // We need to upgrade previous AUTHORIZED entries to CHARGED
          
          finalEntries = finalEntries.map(e => {
              if (e.listingId === listingId && e.status !== BreakEntryStatus.CANCELLED) {
                  return { ...e, status: BreakEntryStatus.CHARGED, chargedAt: now };
              }
              return e;
          });

          // Create Transactions for ALL participants (simulating capture of pre-auth)
          const participants = finalEntries.filter(e => e.listingId === listingId && e.status === BreakEntryStatus.CHARGED);
          
          participants.forEach(e => {
              // Avoid duplicates if logic runs multiple times (though mock IDs prevent exact dupes)
              finalTransactions.unshift({
                  id: `tx_brk_${e.id}_cap_${Date.now()}`,
                  userId: e.userId,
                  amount: -updatedListing.price,
                  type: TransactionType.PURCHASE,
                  referenceId: e.id,
                  referenceType: 'BREAK_ENTRY',
                  balanceAfter: 0, // Mock
                  createdAt: now,
                  description: `Break Threshold Met: ${updatedListing.title}`
              });
          });

          // Credit Seller
          const totalRevenue = updatedListing.price * participants.length;
          finalTransactions.unshift({
              id: `tx_brk_${listingId}_rev_${Date.now()}`,
              userId: updatedListing.sellerId,
              amount: totalRevenue,
              type: TransactionType.DEPOSIT,
              referenceId: listingId,
              referenceType: 'LISTING',
              balanceAfter: 0,
              createdAt: now,
              description: `Break Full Revenue: ${updatedListing.title}`
          });

          // Notify Seller
          setNotifications(prev => [{
              id: `n_full_${Date.now()}`,
              userId: updatedListing.sellerId,
              type: 'BREAK_FULL',
              title: 'Break Filled & Charged!',
              message: `${updatedListing.title} is full. Payments have been captured. Please schedule the stream.`,
              isRead: false,
              createdAt: new Date(),
              linkTo: listingId
          }, ...prev]);
      }

      setBreakEntries(finalEntries);
      setTransactions(finalTransactions);

      // Notification for Buyer
      setNotifications(prev => [{
          id: `n_join_${Date.now()}`,
          userId: currentUser.id,
          type: 'SYSTEM',
          title: isFull ? 'Spot Confirmed' : 'Spot Authorized',
          message: isFull 
            ? `Break filled! Payment captured for ${updatedListing.title}.` 
            : `Payment authorized for ${updatedListing.title}. You will be charged when the break fills.`,
          isRead: false,
          createdAt: new Date(),
          linkTo: listingId
      }, ...prev]);

      return { success: true, message: isFull ? 'Break full! Payment captured.' : 'Spot authorized! Hold placed.' };
  };

  const getBreakEntries = (listingId: string) => breakEntries.filter(e => e.listingId === listingId);

  const scheduleBreak = (listingId: string, date: Date, link?: string) => { 
      const listing = listings.find(l => l.id === listingId);
      if (listing && listing.sellerId !== currentUser?.id) return { success: false, message: 'Unauthorized' };
      
      const now = new Date();
      if (isNaN(date.getTime()) || date < now) {
          return { success: false, message: 'Schedule date must be in the future.' };
      }

      updateListing(listingId, { breakStatus: BreakStatus.SCHEDULED, scheduledLiveAt: date, liveLink: link });
      
      const participants = breakEntries.filter(e => e.listingId === listingId && e.status !== BreakEntryStatus.CANCELLED);
      const uniqueUserIds = Array.from(new Set(participants.map(e => e.userId)));
      
      setNotifications(prev => {
          const newNotifs = uniqueUserIds.map(uid => ({
              id: `n_sched_${Date.now()}_${uid}`,
              userId: uid,
              type: 'SYSTEM' as const,
              title: 'Break Scheduled!',
              message: `${listing?.title} is confirmed for ${date.toLocaleString()}. Get ready!`,
              isRead: false,
              createdAt: new Date(),
              linkTo: listingId
          }));
          return [...newNotifs, ...prev];
      });

      return { success: true, message: 'Break scheduled and participants notified.' };
  };

  const startBreak = (listingId: string) => { 
      const listing = listings.find(l => l.id === listingId);
      if (listing && listing.sellerId !== currentUser?.id) return { success: false, message: 'Unauthorized' };

      updateListing(listingId, { breakStatus: BreakStatus.LIVE, liveStartedAt: new Date() });
      
      const participants = breakEntries.filter(e => e.listingId === listingId && e.status !== BreakEntryStatus.CANCELLED);
      const uniqueUserIds = Array.from(new Set(participants.map(e => e.userId)));

      setNotifications(prev => {
          const newNotifs = uniqueUserIds.map(uid => ({
              id: `n_live_${Date.now()}_${uid}`,
              userId: uid,
              type: 'BREAK_LIVE' as const,
              title: 'Break is LIVE!',
              message: `${listing?.title} is starting now! Join the stream.`,
              isRead: false,
              createdAt: new Date(),
              linkTo: listingId
          }));
          return [...newNotifs, ...prev];
      });

      return { success: true, message: 'Break started!' };
  };

  const completeBreak = (listingId: string, media: string[], notes: string) => { 
      const listing = listings.find(l => l.id === listingId);
      if (!listing) return { success: false, message: 'Listing not found' };
      if (listing.sellerId !== currentUser?.id) return { success: false, message: 'Unauthorized' };

      updateListing(listingId, { breakStatus: BreakStatus.COMPLETED, resultsMedia: media, resultsNotes: notes, liveEndedAt: new Date() });
      
      const participants = breakEntries.filter(e => e.listingId === listingId && e.status !== BreakEntryStatus.CANCELLED);
      const uniqueUserIds = Array.from(new Set(participants.map(e => e.userId)));
      
      setNotifications(prev => {
          const newNotifs = uniqueUserIds.map(uid => ({
              id: `n_done_${Date.now()}_${uid}`,
              userId: uid,
              type: 'BREAK_COMPLETED' as const,
              title: 'Break Completed',
              message: `Results for ${listing.title} are posted.`,
              isRead: false,
              createdAt: new Date(),
              linkTo: listingId
          }));
          return [...newNotifs, ...prev];
      });

      // Note: Payment capture was done on Threshold (joinBreak), so we don't do it here.
      return { success: true, message: 'Break completed. Results posted.' };
  };

  const cancelBreak = (listingId: string) => { 
      const listing = listings.find(l => l.id === listingId);
      if (listing && listing.sellerId !== currentUser?.id) return { success: false, message: 'Unauthorized' };

      updateListing(listingId, { breakStatus: BreakStatus.CANCELLED });
      
      const participants = breakEntries.filter(e => e.listingId === listingId && e.status !== BreakEntryStatus.CANCELLED);
      const now = new Date();
      let refundTransactions: WalletTransaction[] = [];

      // Refund / Void Logic
      setBreakEntries(prev => prev.map(e => {
          if (e.listingId === listingId && e.status !== BreakEntryStatus.CANCELLED) {
              // If previously charged (Charge-on-Threshold), we issue a refund
              if (e.status === BreakEntryStatus.CHARGED) {
                  refundTransactions.push({
                      id: `tx_ref_${e.id}`,
                      userId: e.userId,
                      amount: listing.price, // Credit positive
                      type: TransactionType.REFUND,
                      referenceId: e.id,
                      referenceType: 'BREAK_ENTRY',
                      balanceAfter: 0,
                      createdAt: now,
                      description: `Refund: ${listing.title} Cancelled`
                  });
              }
              // If only Authorized, we just Cancel (Void)
              return { ...e, status: BreakEntryStatus.CANCELLED };
          }
          return e;
      }));

      // Revert Seller Revenue if applicable
      const wasCharged = participants.some(e => e.status === BreakEntryStatus.CHARGED);
      if (wasCharged) {
           const totalRevenue = listing.price * participants.length;
           refundTransactions.push({
                id: `tx_rev_revert_${listing.id}`,
                userId: listing.sellerId,
                amount: -totalRevenue, // Debit negative
                type: TransactionType.WITHDRAWAL, // Adjustment
                referenceId: listing.id,
                referenceType: 'LISTING',
                balanceAfter: 0,
                createdAt: now,
                description: `Revenue Reversal: ${listing.title} Cancelled`
           });
           
           if (currentUser?.id === listing.sellerId) {
                updateProfile({ walletBalance: currentUser.walletBalance - totalRevenue });
           }
      }

      setTransactions(prev => [...refundTransactions, ...prev]);

      const uniqueUserIds = Array.from(new Set(participants.map(e => e.userId)));
      setNotifications(prev => {
          const newNotifs = uniqueUserIds.map(uid => ({
              id: `n_cancel_${Date.now()}_${uid}`,
              userId: uid,
              type: 'BREAK_CANCELLED' as const,
              title: 'Break Cancelled',
              message: `${listing?.title} was cancelled. ${wasCharged ? 'Refunds have been issued.' : 'Authorizations voided.'}`,
              isRead: false,
              createdAt: new Date(),
              linkTo: listingId
          }));
          return [...newNotifs, ...prev];
      });

      return { success: true, message: 'Break cancelled. Refunds/Voids processed.' };
  };

  const removeBreakEntry = async (entryId: string) => { 
      if (!currentUser) return { success: false, message: 'Login required' };
      
      const entry = breakEntries.find(e => e.id === entryId);
      if (!entry) return { success: false, message: 'Entry not found' };
      
      const listing = listings.find(l => l.id === entry.listingId);
      if (!listing) return { success: false, message: 'Listing not found' };

      const isSeller = listing.sellerId === currentUser.id;
      const isParticipant = entry.userId === currentUser.id;

      if (!isSeller && !isParticipant) return { success: false, message: 'Unauthorized' };

      if (isParticipant && !isSeller) {
          if (listing.breakStatus === BreakStatus.LIVE || listing.breakStatus === BreakStatus.COMPLETED || listing.breakStatus === BreakStatus.CANCELLED) {
              return { success: false, message: 'Cannot leave an active, completed, or cancelled break.' };
          }
      }

      // If already charged, issue refund
      if (entry.status === BreakEntryStatus.CHARGED) {
          setTransactions(prev => [{
              id: `tx_ref_${entry.id}`,
              userId: entry.userId,
              amount: listing.price,
              type: TransactionType.REFUND,
              referenceId: entry.id,
              referenceType: 'BREAK_ENTRY',
              balanceAfter: 0,
              createdAt: new Date(),
              description: `Refund: Left Break ${listing.title}`
          }, ...prev]);
          
          // Revert seller revenue for this spot
          setTransactions(prev => [{
                id: `tx_rev_adj_${entry.id}`,
                userId: listing.sellerId,
                amount: -listing.price,
                type: TransactionType.WITHDRAWAL,
                referenceId: listing.id,
                referenceType: 'LISTING',
                balanceAfter: 0,
                createdAt: new Date(),
                description: `Revenue Adj: User Left ${listing.title}`
           }, ...prev]);
      }

      setBreakEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: BreakEntryStatus.CANCELLED } : e));
      
      setListings(prev => prev.map(l => {
          if (l.id === entry.listingId && (l.currentParticipants || 0) > 0) {
              let newStatus: BreakStatus | undefined = l.breakStatus;
              if (newStatus === BreakStatus.FULL_PENDING_SCHEDULE) {
                  newStatus = BreakStatus.OPEN;
              }
              return { ...l, currentParticipants: (l.currentParticipants || 1) - 1, breakStatus: newStatus };
          }
          return l;
      }));

      return { success: true, message: isSeller ? 'Removed participant. Spot opened.' : 'You have left the break.' };
  };
  
  const getLiveEvents = (listingId: string) => {
      return liveEvents.filter(e => e.breakId === listingId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const publishLiveEvent = (listingId: string, type: LiveEventType, payload: any) => {
      const newEvent: LiveEvent = {
          id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          breakId: listingId,
          type,
          payload,
          createdAt: new Date()
      };
      setLiveEvents(prev => [...prev, newEvent]);
  };

  const addLiveChatMessage = (listingId: string, message: LiveChatMessage) => {
      setLiveChatHistory(prev => {
          const current = prev[listingId] || [];
          return { ...prev, [listingId]: [...current, message] };
      });
  };

  const joinWaitlist = async (listingId: string) => {
      if (!currentUser) return { success: false, message: 'Login required' };
      
      if (waitlist.some(w => w.listingId === listingId && w.userId === currentUser.id)) {
          return { success: false, message: 'Already on waitlist' };
      }

      setWaitlist(prev => [...prev, {
          id: `w_${Date.now()}`,
          listingId,
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          joinedAt: new Date()
      }]);
      return { success: true, message: 'Joined waitlist. We will notify you if a spot opens.' };
  };

  const getBidsByListingId = (listingId: string) => {
      return bids
        .filter(b => b.listingId === listingId)
        .sort((a, b) => (b.amount || 0) - (a.amount || 0));
  };
  
  const getRelatedListings = (listing: Listing) => listings.slice(0, 4);
  const getEndingSoonAuctions = (limit: number) => listings.filter(l => l.type === ListingType.AUCTION).slice(0, limit);
  const getClosingBreaks = (limit: number) => listings.filter(l => l.type === ListingType.TIMED_BREAK).slice(0, limit);

  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const markAllNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  
  const depositFunds = async (amount: number) => { 
      if (!currentUser) return { success: false, message: 'Error' };
      if (amount <= 0) return { success: false, message: 'Invalid amount' };
      updateProfile({ walletBalance: currentUser.walletBalance + amount });
      return { success: true, message: 'Deposited' };
  };
  const withdrawFunds = async (amount: number) => { 
      if (!currentUser) return { success: false, message: 'Error' };
      if (amount <= 0) return { success: false, message: 'Invalid amount' };
      if (amount > currentUser.walletBalance) return { success: false, message: 'Insufficient funds' };
      updateProfile({ walletBalance: currentUser.walletBalance - amount });
      return { success: true, message: 'Withdrawn' };
  };

  const joinGroup = (groupId: string) => {
      if(currentUser && !currentUser.joinedGroupIds?.includes(groupId)) {
          updateProfile({ joinedGroupIds: [...(currentUser.joinedGroupIds || []), groupId] });
      }
  };
  const leaveGroup = (groupId: string) => {
      if(currentUser) {
          updateProfile({ joinedGroupIds: (currentUser.joinedGroupIds || []).filter(id => id !== groupId) });
      }
  };
  const getGroupThreads = (groupId: string) => threads.filter(t => t.groupId === groupId);
  const createThread = (groupId: string, title: string, body: string, images?: string[]) => {
      if(!currentUser) return;
      const t: Thread = {
          id: `t_${Date.now()}`,
          groupId,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatar,
          title,
          body,
          images,
          createdAt: new Date(),
          updatedAt: new Date(),
          upvotes: 0,
          commentCount: 0
      };
      setThreads(prev => [t, ...prev]);
  };
  const getThreadComments = (threadId: string) => comments.filter(c => c.threadId === threadId);
  const postComment = (threadId: string, body: string) => {
      if(!currentUser) return;
      const c: Comment = {
          id: `c_${Date.now()}`,
          threadId,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatar,
          body,
          createdAt: new Date(),
          upvotes: 0
      };
      setComments(prev => [...prev, c]);
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, commentCount: t.commentCount + 1 } : t));
  };

  return (
    <StoreContext.Provider value={{
        listings, marketListings, breakListings, filteredListings, currentUser, notifications, availableSets, filters, sortOption, loading, appMode,
        paymentIntents, transactions, liveEvents, liveChatHistory, waitlist, groups, threads, comments,
        setFilter, resetFilters, setSortOption, setAppMode, addListing, updateListing, placeBid, buyNow, joinBreak, getBreakEntries,
        scheduleBreak, startBreak, completeBreak, cancelBreak, removeBreakEntry, getLiveEvents, publishLiveEvent, addLiveChatMessage,
        joinWaitlist, getBidsByListingId, getRelatedListings, getEndingSoonAuctions, getClosingBreaks, getSuggestions,
        markNotificationRead, markAllNotificationsRead, depositFunds, withdrawFunds, getRecommendedGroups, joinGroup, leaveGroup,
        getGroupThreads, createThread, getThreadComments, postComment
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
