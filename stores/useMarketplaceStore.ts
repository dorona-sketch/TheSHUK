
import React, { useState, useMemo } from 'react';
import { 
    Listing, ListingType, User, FilterState, SearchScope, SortOption, 
    AppMode, Bid, WalletTransaction, TransactionType, TcgSet 
} from '../types';
import { INITIAL_LISTINGS, POPULAR_POKEMON } from '../constants';
import { getPokemonEra, normalizeSearchText } from '../utils/filterUtils';

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
    const [appMode, setAppMode] = useState<AppMode>(AppMode.MARKETPLACE);
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
        grades: [], // Initialize grades
        sealedProductType: [],
        breakStatus: [],
        pokemonName: '',
        language: '',
        series: [],
        set: [],
        eras: [],
        listingTypes: [],
        boosterName: '',
        descriptionQuery: '',
        category: undefined 
    });

    const filteredListings = useMemo(() => {
        let result = listings;

        if (appMode === AppMode.MARKETPLACE) {
            result = result.filter(l => l.type !== ListingType.TIMED_BREAK);
        } else if (appMode === AppMode.BREAKS) {
            result = result.filter(l => l.type === ListingType.TIMED_BREAK);
        }

        const setReleaseDateById = new Map(availableSets.map(set => [set.id, set.releaseDate]));

        if (filters.searchQuery) {
            const q = normalizeSearchText(filters.searchQuery);
            result = result.filter(l => {
                const title = normalizeSearchText(l.title || '');
                const pokemon = normalizeSearchText(l.pokemonName || '');
                const setName = normalizeSearchText(l.setName || '');
                const series = normalizeSearchText(l.series || '');
                const seller = normalizeSearchText(l.sellerName || '');
                const desc = normalizeSearchText(l.description || '');
                if (filters.searchScope === SearchScope.TITLE) return title.includes(q);
                if (filters.searchScope === SearchScope.POKEMON) return pokemon.includes(q);
                if (filters.searchScope === SearchScope.SET) return setName.includes(q) || series.includes(q);
                if (filters.searchScope === SearchScope.SELLER) return seller.includes(q);
                if (filters.searchScope === SearchScope.BOOSTER) return normalizeSearchText(l.boosterName || '').includes(q);
                return title.includes(q) || pokemon.includes(q) || setName.includes(q) || desc.includes(q) || seller.includes(q);
            });
        }

        if (filters.pokemonName) {
            const query = normalizeSearchText(filters.pokemonName);
            result = result.filter(l => normalizeSearchText(l.pokemonName || '').includes(query));
        }
        if (filters.language) result = result.filter(l => l.language === filters.language);
        if (filters.boosterName) {
            const bn = filters.boosterName.toLowerCase();
            result = result.filter(l => l.boosterName?.toLowerCase().includes(bn) || l.openedProduct?.productName.toLowerCase().includes(bn));
        }
        if (filters.descriptionQuery) {
            const desc = normalizeSearchText(filters.descriptionQuery);
            result = result.filter(l => normalizeSearchText(l.description || '').includes(desc));
        }
        if (filters.eras.length > 0) {
            result = result.filter(l => {
                const era = getPokemonEra(setReleaseDateById.get(l.setId || ''), l.releaseYear || l.releaseDate?.slice(0, 4));
                return era ? filters.eras.includes(era) : false;
            });
        }


        if (appMode === AppMode.MARKETPLACE && filters.listingTypes.length > 0) {
            result = result.filter(l => filters.listingTypes.includes(l.type));
        }

        // Apply Product Category Filter
        if (filters.category) {
            result = result.filter(l => l.category === filters.category);
        }

        if (filters.series.length > 0) result = result.filter(l => l.series && filters.series.includes(l.series));
        if (filters.set.length > 0) result = result.filter(l => l.setId && filters.set.includes(l.setId));
        
        // Strict Filter Logic Updates
        if (filters.pokemonTypes.length > 0) {
            result = result.filter(l => {
                const type = l.pokemonType;
                if (!type) return false;
                return filters.pokemonTypes.some(t => t.trim() === type.trim());
            });
        }
        
        if (filters.cardCategories.length > 0) {
            result = result.filter(l => {
                const cat = l.cardCategory;
                if (!cat) return false;
                return filters.cardCategories.some(c => c.trim() === cat.trim());
            });
        }
        
        if (filters.variantTags.length > 0) {
            result = result.filter(l => {
                const tags = l.variantTags;
                if (!tags || tags.length === 0) return false;
                return filters.variantTags.some(filterTag => 
                    tags.some(listingTag => listingTag.trim() === filterTag.trim())
                );
            });
        }

        if (filters.condition.length > 0) result = result.filter(l => l.condition && filters.condition.includes(l.condition));
        
        // Grading filters
        if (filters.gradingCompany.length > 0) result = result.filter(l => l.gradingCompany && filters.gradingCompany.includes(l.gradingCompany));
        if (filters.grades.length > 0) result = result.filter(l => l.grade && filters.grades.includes(l.grade.toString()));

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
            grades: [], // Reset grades
            sealedProductType: [],
            breakStatus: [],
            pokemonName: '',
            language: '',
            series: [],
            set: [],
            eras: [],
            listingTypes: [],
            boosterName: '',
            descriptionQuery: '',
            category: undefined
        });
    };

    const getSuggestions = (scope: SearchScope, query: string): string[] => {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase();
        const s = new Set<string>();
        const add = (txt?: string) => { if (txt && txt.toLowerCase().includes(q)) s.add(txt); };

        if (scope === SearchScope.ALL || scope === SearchScope.POKEMON) POPULAR_POKEMON.forEach(name => add(name));
        if (scope === SearchScope.ALL || scope === SearchScope.SET) availableSets.forEach(set => { add(set.name); add(set.series); });

        listings.forEach(l => {
            if (scope === SearchScope.ALL) {
                add(l.title);
                add(l.description);
                if (l.pokemonName && !POPULAR_POKEMON.includes(l.pokemonName)) add(l.pokemonName);
            } else if (scope === SearchScope.TITLE) add(l.title);
            else if (scope === SearchScope.POKEMON) { if (l.pokemonName && !POPULAR_POKEMON.includes(l.pokemonName)) add(l.pokemonName); }
            else if (scope === SearchScope.SET) { add(l.setName); add(l.series); }
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
        
        const listing = listings.find(l => l.id === listingId);
        if (!listing) return { success: false, message: 'Listing not found' };
        
        // Strict Validation
        if (listing.sellerId === currentUser.id) return { success: false, message: 'Cannot bid on your own listing' };
        // MVP: Relaxed balance check for demo purposes
        // if (amount > currentUser.walletBalance) return { success: false, message: 'Insufficient funds' };
        
        if (listing.type !== ListingType.AUCTION) return { success: false, message: 'Not an auction' };
        if (listing.isSold) return { success: false, message: 'Auction already ended' };
        
        // Check Expiry
        if (listing.endsAt && new Date() > new Date(listing.endsAt)) {
            return { success: false, message: 'Auction has expired' };
        }
        
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
        if (listing.isSold) return { success: false, message: 'Item already sold' };
        
        // MVP: Relaxed balance check for demo purposes
        // if (listing.price > currentUser.walletBalance) return { success: false, message: 'Insufficient funds' };
        
        // Ensure it's purchasable
        if (listing.type === ListingType.AUCTION && listing.endsAt && new Date() > new Date(listing.endsAt)) {
             return { success: false, message: 'Listing has ended' };
        }

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
