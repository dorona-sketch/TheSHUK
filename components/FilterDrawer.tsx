
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { PokemonType, VariantTag, CardCategory, Condition, SortOption, ProductCategory, GradingCompany, SealedProductType, SearchScope, BreakStatus, AppMode, Language } from '../types';
import { TAG_DISPLAY_LABELS } from '../constants';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
    [PokemonType.FIRE]: 'bg-red-500 text-white border-red-600',
    [PokemonType.WATER]: 'bg-blue-500 text-white border-blue-600',
    [PokemonType.GRASS]: 'bg-green-500 text-white border-green-600',
    [PokemonType.LIGHTNING]: 'bg-yellow-400 text-black border-yellow-500',
    [PokemonType.PSYCHIC]: 'bg-purple-500 text-white border-purple-600',
    [PokemonType.FIGHTING]: 'bg-orange-700 text-white border-orange-800',
    [PokemonType.DARKNESS]: 'bg-gray-800 text-white border-gray-900',
    [PokemonType.METAL]: 'bg-gray-400 text-black border-gray-500',
    [PokemonType.FAIRY]: 'bg-pink-400 text-white border-pink-500',
    [PokemonType.DRAGON]: 'bg-indigo-600 text-white border-indigo-700',
    [PokemonType.COLORLESS]: 'bg-gray-200 text-black border-gray-300',
};

const SCOPE_LABELS: Record<SearchScope, string> = {
    [SearchScope.ALL]: 'All Fields',
    [SearchScope.TITLE]: 'Title',
    [SearchScope.POKEMON]: 'Pokemon',
    [SearchScope.SET]: 'Set',
    [SearchScope.SELLER]: 'Seller',
    [SearchScope.BOOSTER]: 'Booster Name'
};

export const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose }) => {
  const { filters, setFilter, sortOption, setSortOption, resetFilters, getSuggestions, appMode, availableSets } = useStore();

  // --- Local State for Atomic Updates ---
  // Using Sets for O(1) lookup complexity during render cycles
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);
  const [localScope, setLocalScope] = useState<SearchScope>(filters.searchScope || SearchScope.ALL);
  const [localSort, setLocalSort] = useState<SortOption>(sortOption);
  
  // New Filters
  const [localLanguage, setLocalLanguage] = useState<string>(filters.language || '');
  const [localSeries, setLocalSeries] = useState<string>(filters.series || '');
  const [localSet, setLocalSet] = useState<string>(filters.set || '');

  const [localPokemonTypes, setLocalPokemonTypes] = useState<Set<PokemonType>>(new Set(filters.pokemonTypes));
  const [localCardCategories, setLocalCardCategories] = useState<Set<CardCategory>>(new Set(filters.cardCategories));
  const [localVariantTags, setLocalVariantTags] = useState<Set<VariantTag>>(new Set(filters.variantTags));
  
  const [localCondition, setLocalCondition] = useState<Set<Condition>>(new Set(filters.condition));
  const [localGradingCompany, setLocalGradingCompany] = useState<Set<GradingCompany>>(new Set(filters.gradingCompany));
  const [localSealedProductType, setLocalSealedProductType] = useState<Set<SealedProductType>>(new Set(filters.sealedProductType));

  const [localBreakStatus, setLocalBreakStatus] = useState<Set<BreakStatus>>(new Set(filters.breakStatus));
  const [localPriceMin, setLocalPriceMin] = useState<string>(filters.priceRange.min?.toString() || '');
  const [localPriceMax, setLocalPriceMax] = useState<string>(filters.priceRange.max?.toString() || '');

  // --- Autocomplete State ---
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Sync local state with global state when drawer opens (Snap to current reality)
  useEffect(() => {
    if (isOpen) {
      setLocalSearch(filters.searchQuery);
      setLocalScope(filters.searchScope || SearchScope.ALL);
      setLocalSort(sortOption);
      
      setLocalLanguage(filters.language || '');
      setLocalSeries(filters.series || '');
      setLocalSet(filters.set || '');

      setLocalPokemonTypes(new Set(filters.pokemonTypes || []));
      setLocalCardCategories(new Set(filters.cardCategories || []));
      setLocalVariantTags(new Set(filters.variantTags || []));
      setLocalCondition(new Set(filters.condition || []));
      setLocalGradingCompany(new Set(filters.gradingCompany || []));
      setLocalSealedProductType(new Set(filters.sealedProductType || []));
      
      setLocalBreakStatus(new Set(filters.breakStatus || []));
      setLocalPriceMin(filters.priceRange.min?.toString() || '');
      setLocalPriceMax(filters.priceRange.max?.toString() || '');
    }
  }, [isOpen, filters, sortOption]);

  // --- Derived Data for Selectors ---
  const uniqueSeries = useMemo(() => {
      const series = new Set(availableSets.map(s => s.series));
      return Array.from(series).sort();
  }, [availableSets]);

  const visibleSets = useMemo(() => {
      let sets = availableSets;
      if (localSeries) {
          sets = sets.filter(s => s.series === localSeries);
      }
      return sets.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [availableSets, localSeries]);

  // --- Debounced Suggestions ---
  useEffect(() => {
      const timer = setTimeout(() => {
          if (localSearch && localSearch.length > 1) {
              const results = getSuggestions(localScope, localSearch);
              setSuggestions(results);
              setShowSuggestions(results.length > 0);
          } else {
              setSuggestions([]);
              setShowSuggestions(false);
          }
      }, 250); // 250ms debounce
      return () => clearTimeout(timer);
  }, [localSearch, localScope, getSuggestions]);

  // Click outside to close suggestions
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node) && 
              searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
              setShowSuggestions(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Core Toggle Logic (O(1)) ---
  const toggleFilter = useCallback(<T,>(item: T, setFunction: React.Dispatch<React.SetStateAction<Set<T>>>) => {
      setFunction(prev => {
          const next = new Set(prev);
          if (next.has(item)) {
              next.delete(item);
          } else {
              next.add(item);
          }
          return next;
      });
  }, []);

  // --- Keyboard Navigation for Autocomplete ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!showSuggestions) return;

      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
              handleSuggestionClick(suggestions[activeSuggestionIndex]);
          } else {
              setShowSuggestions(false);
          }
      } else if (e.key === 'Escape') {
          setShowSuggestions(false);
      }
  };

  // --- Atomic Actions ---

  const handleApply = () => {
    // 1. Text & Sort
    setFilter('searchQuery', localSearch);
    setFilter('searchScope', localScope); 
    setSortOption(localSort);
    
    // 2. Selectors
    setFilter('language', localLanguage);
    setFilter('series', localSeries);
    setFilter('set', localSet);

    // 3. Set-based Filters (Convert back to Arrays for global store)
    setFilter('pokemonTypes', Array.from(localPokemonTypes));
    setFilter('cardCategories', Array.from(localCardCategories));
    setFilter('variantTags', Array.from(localVariantTags));
    setFilter('condition', Array.from(localCondition));
    setFilter('gradingCompany', Array.from(localGradingCompany));
    setFilter('sealedProductType', Array.from(localSealedProductType));
    
    setFilter('breakStatus', Array.from(localBreakStatus));
    
    // 4. Ranges
    setFilter('priceRange', {
        min: localPriceMin ? parseFloat(localPriceMin) : null,
        max: localPriceMax ? parseFloat(localPriceMax) : null
    });

    onClose();
  };

  const handleGlobalReset = () => {
      // 1. Reset Global
      resetFilters();
      setSortOption(SortOption.NEWEST);
      
      // 2. Reset Local (Immediate visual feedback)
      setLocalSearch('');
      setLocalScope(SearchScope.ALL);
      setLocalSort(SortOption.NEWEST);
      setLocalLanguage('');
      setLocalSeries('');
      setLocalSet('');
      setLocalPokemonTypes(new Set());
      setLocalCardCategories(new Set());
      setLocalVariantTags(new Set());
      setLocalCondition(new Set());
      setLocalGradingCompany(new Set());
      setLocalSealedProductType(new Set());
      setLocalBreakStatus(new Set());
      setLocalPriceMin('');
      setLocalPriceMax('');
  };

  const handleSuggestionClick = (value: string) => {
      setLocalSearch(value);
      setShowSuggestions(false);
      searchInputRef.current?.focus();
  };

  const clearSearch = () => {
      setLocalSearch('');
      setSuggestions([]);
      searchInputRef.current?.focus();
  };

  const highlightMatch = (text: string, query: string) => {
      if (!query) return text;
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${safeQuery})`, 'gi'));
      return parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? <strong key={i} className="text-primary-700 bg-primary-50">{part}</strong> : part
      );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-600 bg-opacity-50 transition-opacity backdrop-blur-sm" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      <div className="fixed inset-y-0 right-0 flex max-w-full pointer-events-none">
        <div 
            ref={drawerRef}
            className="w-screen max-w-md pointer-events-auto flex flex-col bg-white shadow-2xl transform transition-transform ease-in-out duration-300 h-full"
        >
            
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h2 id="filter-drawer-title" className="text-lg font-bold text-gray-900">Filters & Sort</h2>
                <div className="flex gap-4">
                    <button 
                        onClick={handleGlobalReset} 
                        className="text-sm text-red-600 hover:text-red-800 font-medium hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    >
                        Clear All
                    </button>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                        aria-label="Close filters"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">
                
                {/* 0. Scoped Search & Autocomplete */}
                <section className="relative z-20">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Search</h3>
                    
                    <div className="flex flex-col gap-2">
                        {/* Search Input with Scope Built-in */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={localSearch}
                                onChange={(e) => {
                                    setLocalSearch(e.target.value);
                                    setActiveSuggestionIndex(-1);
                                }}
                                onKeyDown={handleKeyDown}
                                onFocus={() => {
                                    if (localSearch) setShowSuggestions(true);
                                }}
                                placeholder="Search..."
                                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow shadow-sm"
                                autoComplete="off"
                                aria-label="Search Query"
                                aria-haspopup="listbox"
                                aria-expanded={showSuggestions}
                            />
                            {localSearch && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                    aria-label="Clear search"
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}

                            {/* Suggestions Dropdown */}
                            {showSuggestions && (
                                <div ref={suggestionRef} className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
                                    {suggestions.length > 0 ? (
                                        <ul role="listbox">
                                            {suggestions.map((suggestion, idx) => (
                                                <li 
                                                    key={idx}
                                                    role="option"
                                                    aria-selected={idx === activeSuggestionIndex}
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className={`px-4 py-3 text-sm cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between transition-colors
                                                        ${idx === activeSuggestionIndex ? 'bg-primary-50 text-primary-900' : 'hover:bg-gray-50 text-gray-700'}`}
                                                >
                                                    <span className="truncate">{highlightMatch(suggestion, localSearch)}</span>
                                                    {idx === activeSuggestionIndex && (
                                                        <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
                                            No matches found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Scope Selector */}
                        <div className="flex gap-2 items-center mt-1">
                            <span className="text-xs text-gray-500 font-medium">Search in:</span>
                            <select 
                                value={localScope}
                                onChange={(e) => setLocalScope(e.target.value as SearchScope)}
                                className="bg-gray-100 border-none text-xs font-bold text-gray-700 rounded-md py-1 pl-2 pr-6 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                            >
                                {Object.values(SearchScope).map(scope => (
                                    <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* 1. Sort Order */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Sort By</h3>
                    <select 
                        value={localSort} 
                        onChange={(e) => setLocalSort(e.target.value as SortOption)}
                        className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                        aria-label="Sort Order"
                    >
                        <option value={SortOption.NEWEST}>Newest Listed</option>
                        <option value={SortOption.ENDING_SOON}>Ending Soonest</option>
                        <option value={SortOption.PRICE_ASC}>Price: Low to High</option>
                        <option value={SortOption.PRICE_DESC}>Price: High to Low</option>
                        <option value={SortOption.MOST_BIDS}>Most Bids</option>
                    </select>
                </section>

                {/* 2. Language */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Language</h3>
                    <select
                        value={localLanguage}
                        onChange={(e) => setLocalLanguage(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                        <option value="">Any Language</option>
                        {Object.values(Language).map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </section>

                {/* 3. Era & Set (Dynamic from API) */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Series & Set</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Era / Series</label>
                            <select
                                value={localSeries}
                                onChange={(e) => {
                                    setLocalSeries(e.target.value);
                                    setLocalSet(''); // Reset set when series changes
                                }}
                                className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                            >
                                <option value="">All Eras</option>
                                {uniqueSeries.map(series => (
                                    <option key={series} value={series}>{series}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Set / Expansion</label>
                            <select
                                value={localSet}
                                onChange={(e) => setLocalSet(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                                disabled={availableSets.length === 0}
                            >
                                <option value="">All Sets</option>
                                {visibleSets.map(set => (
                                    <option key={set.id} value={set.id}>{set.name} ({set.total})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* 4. Price Range */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Price Range ($)</h3>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                            <input 
                                type="number" 
                                placeholder="Min" 
                                value={localPriceMin} 
                                onChange={(e) => setLocalPriceMin(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 pl-6 text-sm focus:ring-primary-500 focus:border-primary-500"
                                aria-label="Min Price"
                            />
                        </div>
                        <span className="text-gray-400 font-medium">-</span>
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                            <input 
                                type="number" 
                                placeholder="Max" 
                                value={localPriceMax} 
                                onChange={(e) => setLocalPriceMax(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 pl-6 text-sm focus:ring-primary-500 focus:border-primary-500"
                                aria-label="Max Price"
                            />
                        </div>
                    </div>
                </section>

                {/* 5. Break Status (Only relevant for Breaks/Combined) */}
                {(appMode === AppMode.BREAKS || appMode === AppMode.COMBINED) && (
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Break Status</h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { val: BreakStatus.OPEN, label: 'Open Spots' },
                                { val: BreakStatus.FULL_PENDING_SCHEDULE, label: 'Filling/Full' },
                                { val: BreakStatus.LIVE, label: 'Live Now' },
                                { val: BreakStatus.COMPLETED, label: 'Completed' }
                            ].map(status => {
                                const isSelected = localBreakStatus.has(status.val);
                                return (
                                    <button
                                        key={status.val}
                                        onClick={() => toggleFilter(status.val, setLocalBreakStatus)}
                                        aria-pressed={isSelected}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all transform active:scale-95 ${
                                            isSelected
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {status.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 6. Pokemon Types (Chips) */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Pokemon Type</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.values(PokemonType).map(type => {
                            const isSelected = localPokemonTypes.has(type);
                            return (
                                <button
                                    key={type}
                                    onClick={() => toggleFilter(type, setLocalPokemonTypes)}
                                    aria-pressed={isSelected}
                                    className={`px-2 py-2 rounded-md text-xs font-bold transition-all border shadow-sm active:scale-95 ${
                                        isSelected 
                                        ? `ring-2 ring-offset-1 ring-primary-500 ${TYPE_COLORS[type]}`
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* 7. Card Categories */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Card Category</h3>
                    <div className="flex flex-wrap gap-2">
                         {Object.values(CardCategory).map(cat => {
                             const isSelected = localCardCategories.has(cat);
                             return (
                                 <button
                                    key={cat}
                                    onClick={() => toggleFilter(cat, setLocalCardCategories)}
                                    aria-pressed={isSelected}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shadow-sm ${
                                        isSelected
                                        ? 'bg-gray-900 text-white border-gray-900'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                 >
                                     {cat}
                                 </button>
                             );
                         })}
                    </div>
                </section>

                {/* 8. Variant Tags */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Rarity & Variants</h3>
                    <div className="grid grid-cols-2 gap-2">
                         {Object.values(VariantTag).map(tag => (
                             <label key={tag} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-md transition-colors border border-transparent hover:border-gray-200">
                                 <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localVariantTags.has(tag) ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}>
                                     {localVariantTags.has(tag) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                 </div>
                                 <input 
                                    type="checkbox" 
                                    checked={localVariantTags.has(tag)}
                                    onChange={() => toggleFilter(tag, setLocalVariantTags)}
                                    className="hidden"
                                 />
                                 <span className="text-sm text-gray-700 font-medium">{TAG_DISPLAY_LABELS[tag] || tag}</span>
                             </label>
                         ))}
                    </div>
                </section>

                {/* 9. Product Category specific */}
                {filters.category === ProductCategory.RAW_CARD && (
                    <section>
                         <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Condition</h3>
                         <div className="flex flex-wrap gap-2">
                            {Object.values(Condition).map(c => {
                                const isSelected = localCondition.has(c);
                                return (
                                    <button
                                        key={c}
                                        onClick={() => toggleFilter(c, setLocalCondition)}
                                        aria-pressed={isSelected}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm ${
                                            isSelected ? 'bg-primary-100 border-primary-300 text-primary-800 font-bold' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-600'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                );
                            })}
                         </div>
                    </section>
                )}

                {filters.category === ProductCategory.GRADED_CARD && (
                    <section>
                         <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Grading Company</h3>
                         <div className="flex flex-wrap gap-2">
                            {Object.values(GradingCompany).map(company => {
                                const isSelected = localGradingCompany.has(company);
                                return (
                                    <button
                                        key={company}
                                        onClick={() => toggleFilter(company, setLocalGradingCompany)}
                                        aria-pressed={isSelected}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-sm ${
                                            isSelected ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {company}
                                    </button>
                                );
                            })}
                         </div>
                    </section>
                )}

                {filters.category === ProductCategory.SEALED_PRODUCT && (
                    <section>
                         <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Product Type</h3>
                         <div className="grid grid-cols-2 gap-2">
                            {Object.values(SealedProductType).map(type => (
                                <label key={type} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-md transition-colors border border-transparent hover:border-gray-200">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localSealedProductType.has(type) ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}>
                                        {localSealedProductType.has(type) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={localSealedProductType.has(type)}
                                        onChange={() => toggleFilter(type, setLocalSealedProductType)}
                                        className="hidden"
                                    />
                                    <span className="text-sm text-gray-700 font-medium">{type}</span>
                                </label>
                            ))}
                         </div>
                    </section>
                )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-30">
                <button 
                    onClick={handleApply}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all active:scale-[0.98]"
                >
                    Apply Filters
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
