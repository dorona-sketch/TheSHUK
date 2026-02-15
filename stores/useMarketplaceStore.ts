import React, { useState, useMemo } from 'react';
import { 
    Listing, ListingType, User, FilterState, SearchScope, SortOption, 
    AppMode, Bid, WalletTransaction, TransactionType, TcgSet 
} from '../types';
import { INITIAL_LISTINGS, POPULAR_POKEMON } from '../constants';

interface WalletInterface {
    setTransactions: React.Dispatch<React.SetStateAction<WalletTransaction[]>>;
}

export const useMarketplaceStore = (
    currentUser: User | null, 
    wallet: WalletInterface, 
    updateProfile: (updates: Partial<User>) => Promise<void>,
    availableSets: TcgSet[]
) => {
    const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
    const [bids, setBids] = useState<Bid[]>([]);
    const [appMode, setAppMode] = useState<AppMode>(AppMode.COMBINED);
    const [sortOption, setSortOption] = useState<SortOption>(SortOption.NEWEST);
    
    const [filters, setFilters] = useState<FilterState>({
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
        series: [],
        set: [],
        boosterName: ''
    });

    const filteredListings = useMemo(() => {
        let result = listings;

        if (appMode === AppMode.MARKETPLACE) {
            result = result.filter(l => l.type !== ListingType.TIMED_BREAK);
        } else if (appMode === AppMode.BREAKS) {
            result = result.filter(l => l.type === ListingType.TIMED_BREAK);
        }

        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            result = result.filter(l => {
                if (filters.searchScope === SearchScope.TITLE) return l.title.toLowerCase().includes(q);
                if (filters.searchScope === SearchScope.POKEMON) return l.pokemonName?.toLowerCase().includes(q);
                if (filters.searchScope === SearchScope.SET) return l.setName?.toLowerCase().includes(q) || l.series?.toLowerCase().includes(q);
                if (filters.searchScope === SearchScope.SELLER) return l.sellerName.toLowerCase().includes(q);
                if (filters.searchScope === SearchScope.BOOSTER) return l.boosterName?.toLowerCase().includes(q);
                return l.title.toLowerCase().includes(q) || 
                       l.pokemonName?.toLowerCase().includes(q) || 
                       l.setName?.toLowerCase().includes(q) ||
                       l.description.toLowerCase().includes(q) ||
                       l.sellerName.toLowerCase().includes(q);
            });
        }

        if (filters.pokemonName) result = result.filter(l => l.pokemonName?.toLowerCase().includes(filters.pokemonName.toLowerCase()));
        if (filters.language) result = result.filter(l => l.language === filters.language);
        if (filters.boosterName) {
            const bn = filters.boosterName.toLowerCase();
            result = result.filter(l => l.boosterName?.toLowerCase().includes(bn) || l.openedProduct?.productName.toLowerCase().includes(bn));
        }

        if (filters.series.length > 0) result = result.filter(l => l.series && filters.series.includes(l.series));
        if (filters.set.length > 0) result = result.filter(l => l.setId && filters.set.includes(l.setId));
        if (filters.pokemonTypes.length > 0) result = result.filter(l => l.pokemonType && filters.pokemonTypes.includes(l.pokemonType));
        if (filters.cardCategories.length > 0) result = result.filter(l => l.cardCategory && filters.cardCategories.includes(l.cardCategory));
        
        if (filters.variantTags.length > 0) {
            result = result.filter(l => l.variantTags && filters.variantTags.some((t: any) => l.variantTags?.includes(t)));
        }

        if (filters.condition.length > 0) result = result.filter(l => l.condition && filters.condition.includes(l.condition));
        if (filters.gradingCompany.length > 0) result = result.filter(l => l.gradingCompany && filters.gradingCompany.includes(l.gradingCompany));
        if (filters.sealedProductType.length > 0) result = result.filter(l => l.sealedProductType && filters.sealedProductType.includes(l.sealedProductType));
        if (filters.breakStatus.length > 0) result = result.filter(l => l.breakStatus && filters.breakStatus.includes(l.breakStatus));

        if (filters.priceRange.min !== null) result = result.filter(l => l.price >= filters.priceRange.min!);
        if (filters.priceRange.max !== null) result = result.filter(l => l.price <= filters.priceRange.max!);

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
            series: [],
            set: [],
            boosterName: ''
        });
    };

    const getSuggestions = (scope: SearchScope, query: string): string[] => {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase();
        const s = new Set<string>();
        const add = (txt?: string) => { if (txt && txt.toLowerCase().includes(q)) s.add(txt); };

        if (scope === SearchScope.ALL || scope === SearchScope.POKEMON) POPULAR_POKEMON.forEach(name => add(name));
        if (scope === SearchScope.ALL || scope === SearchScope.SET) availableSets.forEach(set => add(set.name));

        listings.forEach(l => {
            if (scope === SearchScope.ALL) {
                add(l.title);
                if (l.pokemonName && !POPULAR_POKEMON.includes(l.pokemonName)) add(l.pokemonName);
            } else if (scope === SearchScope.TITLE) add(l.title);
            else if (scope === SearchScope.POKEMON) { if (l.pokemonName && !POPULAR_POKEMON.includes(l.pokemonName)) add(l.pokemonName); }
            else if (scope === SearchScope.SELLER) add(l.sellerName);
            else if (scope === SearchScope.BOOSTER) add(l.boosterName);
        });
        
        return Array.from(s).sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            if (aLower === q && bLower !== q) return -1;
            if (bLower === q && aLower !== q) return 1;
            const aStarts = aLower.startsWith(q);
            const bStarts = bLower.startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.localeCompare(b);
        }).slice(0, 10);
    };

    const addListing = (listing: Listing) => setListings(prev => [listing, ...prev]);
    const updateListing = (id: string, updates: Partial<Listing>) => setListings(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    const verifySellerListings = (sellerId: string) => setListings(prev => prev.map(l => l.sellerId === sellerId ? { ...l, sellerVerified: true } : l));

    const placeBid = (listingId: string, amount: number) => {
        if (!currentUser) return { success: false, message: 'Please sign in' };
        if (amount > currentUser.walletBalance) return { success: false, message: 'Insufficient funds' };
        
        const bid: Bid = {
            id: `b_${Date.now()}`,
            listingId,
            bidderId: currentUser.id,
            bidderName: currentUser.name,
            amount,
            createdAt: new Date()
        };
        
        setBids(prev => [bid, ...prev]);
        updateListing(listingId, { 
            currentBid: amount, 
            bidsCount: (listings.find(l => l.id === listingId)?.bidsCount || 0) + 1 
        });
        
        return { success: true, message: 'Bid placed successfully' };
    };

    const buyNow = (listingId: string) => {
        if (!currentUser) return { success: false, message: 'Please sign in' };
        const listing = listings.find(l => l.id === listingId);
        if (!listing) return { success: false, message: 'Listing not found' };
        if (listing.price > currentUser.walletBalance) return { success: false, message: 'Insufficient funds' };
        
        updateListing(listingId, { isSold: true });
        
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
        wallet.setTransactions(prev => [tx, ...prev]);
        updateProfile({ walletBalance: tx.balanceAfter });
        
        return { success: true, message: 'Purchase successful!' };
    };

    const getBidsByListingId = (listingId: string) => bids.filter(b => b.listingId === listingId).sort((a,b) => b.amount - a.amount);
    
    const getEndingSoonAuctions = (limit: number) => {
        return listings
          .filter(l => l.type === ListingType.AUCTION && !l.isSold)
          .sort((a, b) => new Date(a.endsAt || 0).getTime() - new Date(b.endsAt || 0).getTime())
          .slice(0, limit);
    };
  
    const getRelatedListings = (listing: Listing) => {
        return listings
          .filter(l => l.id !== listing.id && (
              l.setId === listing.setId || 
              l.pokemonName === listing.pokemonName ||
              l.series === listing.series
          ))
          .slice(0, 4);
    };

    return {
        listings,
        setListings,
        filteredListings,
        filters,
        sortOption,
        appMode,
        setAppMode,
        setFilter,
        setSortOption,
        resetFilters,
        getSuggestions,
        addListing,
        updateListing,
        verifySellerListings,
        placeBid,
        buyNow,
        getBidsByListingId,
        getEndingSoonAuctions,
        getRelatedListings
    };
};