
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { PokemonType, VariantTag, CardCategory, Condition, SortOption, ProductCategory, GradingCompany, SealedProductType, SearchScope, BreakStatus, AppMode, Language, TcgSet } from '../types';
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
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);
  const [localScope, setLocalScope] = useState<SearchScope>(filters.searchScope || SearchScope.ALL);
  const [localSort, setLocalSort] = useState<SortOption>(sortOption);
  
  // New Filters
  const [localPokemonName, setLocalPokemonName] = useState<string>(filters.pokemonName || '');
  const [localBoosterName, setLocalBoosterName] = useState<string>(filters.boosterName || '');
  const [localLanguage, setLocalLanguage] = useState<string>(filters.language || '');
  const [localSeries, setLocalSeries] = useState<Set<string>>(new Set(filters.series || []));
  const [localSet, setLocalSet] = useState<Set<string>>(new Set(filters.set || []));

  const [localPokemonTypes, setLocalPokemonTypes] = useState<Set<PokemonType>>(new Set(filters.pokemonTypes));
  const [localCardCategories, setLocalCardCategories] = useState<Set<CardCategory>>(new Set(filters.cardCategories));
  const [localVariantTags, setLocalVariantTags] = useState<Set<VariantTag>>(new Set(filters.variantTags));
  
  const [localCondition, setLocalCondition] = useState<Set<Condition>>(new Set(filters.condition));
  const [localGradingCompany, setLocalGradingCompany] = useState<Set<GradingCompany>>(new Set(filters.gradingCompany));
  const [localSealedProductType, setLocalSealedProductType] = useState<Set<SealedProductType>>(new Set(filters.sealedProductType));

  // Add Product Category State if we want to filter by Raw/Graded/Sealed
  const [localCategory, setLocalCategory] = useState<ProductCategory | undefined>(filters.category);

  const [localBreakStatus, setLocalBreakStatus] = useState<Set<BreakStatus>>(new Set(filters.breakStatus));
  const [localPriceMin, setLocalPriceMin] = useState<string>(filters.priceRange.min?.toString() || '');
  const [localPriceMax, setLocalPriceMax] = useState<string>(filters.priceRange.max?.toString() || '');

  // --- Autocomplete State ---
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // --- Pokemon Name Autocomplete State ---
  const [pokeSuggestions, setPokeSuggestions] = useState<string[]>([]);
  const [showPokeSuggestions, setShowPokeSuggestions] = useState(false);
  const [activePokeSuggestionIndex, setActivePokeSuggestionIndex] = useState(-1);
  const pokeInputRef = useRef<HTMLInputElement>(null);
  const pokeSuggestionRef = useRef<HTMLDivElement>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Sync local state with global state when drawer opens (Snap to current reality)
  useEffect(() => {
    if (isOpen) {
      setLocalSearch(filters.searchQuery);
      setLocalScope(filters.searchScope || SearchScope.ALL);
      setLocalSort(sortOption);
      
      setLocalPokemonName(filters.pokemonName || '');
      setLocalBoosterName(filters.boosterName || '');
      setLocalLanguage(filters.language || '');
      setLocalSeries(new Set(filters.series || []));
      setLocalSet(new Set(filters.set || []));

      setLocalPokemonTypes(new Set(filters.pokemonTypes || []));
      setLocalCardCategories(new Set(filters.cardCategories || []));
      setLocalVariantTags(new Set(filters.variantTags || []));
      setLocalCondition(new Set(filters.condition || []));
      setLocalGradingCompany(new Set(filters.gradingCompany || []));
      setLocalSealedProductType(new Set(filters.sealedProductType || []));
      
      setLocalCategory(filters.category);

      setLocalBreakStatus(new Set(filters.breakStatus || []));
      setLocalPriceMin(filters.priceRange.min?.toString() || '');
      setLocalPriceMax(filters.priceRange.max?.toString() || '');
    }
  }, [isOpen, filters, sortOption]);

  // --- Accessibility: Focus Management & Trap ---
  useEffect(() => {
      if (isOpen) {
          // Save current focus
          previousFocusRef.current = document.activeElement as HTMLElement;
          
          // Focus the close button or first focusable element inside the drawer
          const focusable = drawerRef.current?.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusable && focusable.length > 0) {
              // Try to focus the first input if available (usually search), otherwise the close button
              const searchInput = drawerRef.current?.querySelector('input');
              if (searchInput) {
                  (searchInput as HTMLElement).focus();
              } else {
                  (focusable[0] as HTMLElement).focus();
              }
          }

          // Disable body scroll
          document.body.style.overflow = 'hidden';
      } else {
          // Restore focus
          if (previousFocusRef.current) {
              previousFocusRef.current.focus();
          }
          // Enable body scroll
          document.body.style.overflow = '';
      }

      // Cleanup on unmount in case component is removed while open
      return () => {
          document.body.style.overflow = '';
      };
  }, [isOpen]);

  // Handle Tab Trap and Escape Key
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isOpen) return;

          if (e.key === 'Escape') {
              onClose();
              return;
          }

          if (e.key === 'Tab') {
              if (!drawerRef.current) return;
              
              const focusableElements = drawerRef.current.querySelectorAll(
                  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
              );
              
              if (focusableElements.length === 0) return;

              const firstElement = focusableElements[0] as HTMLElement;
              const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

              if (e.shiftKey) { // Shift + Tab
                  if (document.activeElement === firstElement) {
                      e.preventDefault();
                      lastElement.focus();
                  }
              } else { // Tab
                  if (document.activeElement === lastElement) {
                      e.preventDefault();
                      firstElement.focus();
                  }
              }
          }
      };

      if (isOpen) {
          window.addEventListener('keydown', handleKeyDown);
      }
      
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [isOpen, onClose]);

  // --- Derived Data for Selectors ---
  const uniqueSeries = useMemo(() => {
      const series = new Set(availableSets.map(s => s.series));
      return Array.from(series).sort();
  }, [availableSets]);

  const visibleSets = useMemo(() => {
      let sets = availableSets;
      // If any series are selected, filter sets by those series
      if (localSeries.size > 0) {
          sets = sets.filter(s => localSeries.has(s.series));
      }
      return sets.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [availableSets, localSeries]);

  // --- Debounced Suggestions (Main Search) ---
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

  // --- Debounced Suggestions (Pokemon Name) ---
  useEffect(() => {
      const timer = setTimeout(() => {
          if (localPokemonName && localPokemonName.length > 1) {
              const results = getSuggestions(SearchScope.POKEMON, localPokemonName);
              setPokeSuggestions(results);
              setShowPokeSuggestions(results.length > 0);
          } else {
              setPokeSuggestions([]);
              setShowPokeSuggestions(false);
          }
      }, 250);
      return () => clearTimeout(timer);
  }, [localPokemonName, getSuggestions]);

  // Click outside to close suggestions
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          // Main Search
          if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node) && 
              searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
              setShowSuggestions(false);
          }
          // Pokemon Name
          if (pokeSuggestionRef.current && !pokeSuggestionRef.current.contains(event.target as Node) && 
              pokeInputRef.current && !pokeInputRef.current.contains(event.target as Node)) {
              setShowPokeSuggestions(false);
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
  const handleInputKeyDown = (e: React.KeyboardEvent, isPokemonSearch: boolean = false) => {
      const isShowing = isPokemonSearch ? showPokeSuggestions : showSuggestions;
      const suggestionsList = isPokemonSearch ? pokeSuggestions : suggestions;
      const activeIndex = isPokemonSearch ? activePokeSuggestionIndex : activeSuggestionIndex;
      const setIndex = isPokemonSearch ? setActivePokeSuggestionIndex : setActiveSuggestionIndex;
      const setShow = isPokemonSearch ? setShowPokeSuggestions : setShowSuggestions;
      // Note: We handle selection logic slightly differently for main search smart fill

      if (!isShowing) {
          if (e.key === 'ArrowDown') {
              setShow(true);
          }
          return;
      }

      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setIndex(prev => (prev < suggestionsList.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestionsList.length) {
              handleSuggestionClick(suggestionsList[activeIndex], isPokemonSearch);
          } else {
              setShow(false);
          }
      } else if (e.key === 'Escape') {
          e.stopPropagation(); // Stop global escape from closing modal immediately
          setShow(false);
      }
  };

  // --- Atomic Actions ---

  const handleApply = () => {
    // 1. Text & Sort
    setFilter('searchQuery', localSearch);
    setFilter('searchScope', localScope); 
    setSortOption(localSort);
    
    // 2. Selectors
    setFilter('pokemonName', localPokemonName);
    setFilter('boosterName', localBoosterName);
    setFilter('language', localLanguage);
    
    // Convert Sets back to arrays
    setFilter('series', Array.from(localSeries));
    setFilter('set', Array.from(localSet));

    // 3. Set-based Filters (Convert back to Arrays for global store)
    setFilter('pokemonTypes', Array.from(localPokemonTypes));
    setFilter('cardCategories', Array.from(localCardCategories));
    setFilter('variantTags', Array.from(localVariantTags));
    setFilter('condition', Array.from(localCondition));
    setFilter('gradingCompany', Array.from(localGradingCompany));
    setFilter('sealedProductType', Array.from(localSealedProductType));
    
    setFilter('category', localCategory);

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
      setLocalPokemonName('');
      setLocalBoosterName('');
      setLocalLanguage('');
      setLocalSeries(new Set());
      setLocalSet(new Set());
      setLocalPokemonTypes(new Set());
      setLocalCardCategories(new Set());
      setLocalVariantTags(new Set());
      setLocalCondition(new Set());
      setLocalGradingCompany(new Set());
      setLocalSealedProductType(new Set());
      setLocalBreakStatus(new Set());
      setLocalCategory(undefined);
      setLocalPriceMin('');
      setLocalPriceMax('');
  };

  const handleSuggestionClick = (value: string, isPokemonSearch: boolean = false) => {
      if (isPokemonSearch) {
          setLocalPokemonName(value);
          setShowPokeSuggestions(false);
          pokeInputRef.current?.focus();
      } else {
          // Smart Search: Check if the value matches a known Set Name
          const matchedSet = availableSets.find(s => s.name.toLowerCase() === value.toLowerCase());
          
          if (matchedSet) {
              // Smart Auto-Fill Logic
              // 1. Select the Set
              setLocalSet(new Set([matchedSet.id]));
              // 2. Select the corresponding Series
              setLocalSeries(new Set([matchedSet.series]));
              // 3. Clear the text search so the filter does the work
              setLocalSearch('');
          } else {
              // Normal text search
              setLocalSearch(value);
          }
          
          setShowSuggestions(false);
          searchInputRef.current?.focus();
      }
  };

  const clearSearch = () => {
      setLocalSearch('');
      setSuggestions([]);
      searchInputRef.current?.focus();
  };

  const clearPokemonName = () => {
      setLocalPokemonName('');
      setPokeSuggestions([]);
      pokeInputRef.current?.focus();
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
    <div 
        className="fixed inset-0 z-[100] overflow-hidden" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="filter-drawer-title"
    >
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
                        type="button"
                        onClick={handleGlobalReset} 
                        className="text-sm text-red-600 hover:text-red-800 font-medium hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    >
                        Clear All
                    </button>
                    <button 
                        type="button"
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
                                role="combobox"
                                value={localSearch}
                                onChange={(e) => {
                                    setLocalSearch(e.target.value);
                                    setActiveSuggestionIndex(-1);
                                }}
                                onKeyDown={(e) => handleInputKeyDown(e, false)}
                                onFocus={() => {
                                    if (localSearch) setShowSuggestions(true);
                                }}
                                placeholder="Search sets, pokemon..."
                                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow shadow-sm"
                                autoComplete="off"
                                aria-label="Search Query"
                                aria-autocomplete="list"
                                aria-controls="search-results-list"
                                aria-activedescendant={activeSuggestionIndex >= 0 ? `search-result-item-${activeSuggestionIndex}` : undefined}
                                aria-expanded={showSuggestions}
                            />
                            {localSearch && (
                                <button
                                    type="button"
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
                                        <ul id="search-results-list" role="listbox">
                                            {suggestions.map((suggestion, idx) => {
                                                // Check if it's a known set to visually indicate it will auto-filter
                                                const isSet = availableSets.some(s => s.name.toLowerCase() === suggestion.toLowerCase());
                                                return (
                                                    <li 
                                                        key={idx}
                                                        id={`search-result-item-${idx}`}
                                                        role="option"
                                                        aria-selected={idx === activeSuggestionIndex}
                                                        onClick={() => handleSuggestionClick(suggestion, false)}
                                                        className={`px-4 py-3 text-sm cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between transition-colors
                                                            ${idx === activeSuggestionIndex ? 'bg-primary-50 text-primary-900' : 'hover:bg-gray-50 text-gray-700'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {isSet && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase">Set</span>}
                                                            <span className="truncate">{highlightMatch(suggestion, localSearch)}</span>
                                                        </div>
                                                        {idx === activeSuggestionIndex && (
                                                            <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                        )}
                                                    </li>
                                                );
                                            })}
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
                            <span className="text-xs text-gray-500 font-medium" id="scope-label">Search in:</span>
                            <select 
                                value={localScope}
                                aria-labelledby="scope-label"
                                onChange={(e) => setLocalScope(e.target.value as SearchScope)}
                                className="bg-gray-100 border-none text-xs font-bold text-gray-700 rounded-md py-1 pl-2 pr-6 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                            >
                                {Object.values(SearchScope).map(scope => (
                                    <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* 0.5. Specific Pokemon Name Filter */}
                <section className="relative z-10">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Pokémon Name</h3>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeWidth="2" />
                                <circle cx="12" cy="12" r="3" strokeWidth="2" fill="currentColor" className="text-gray-100" />
                            </svg>
                        </div>
                        <input
                            ref={pokeInputRef}
                            type="text"
                            role="combobox"
                            value={localPokemonName}
                            onChange={(e) => {
                                setLocalPokemonName(e.target.value);
                                setActivePokeSuggestionIndex(-1);
                            }}
                            onKeyDown={(e) => handleInputKeyDown(e, true)}
                            onFocus={() => {
                                if (localPokemonName) setShowPokeSuggestions(true);
                            }}
                            placeholder="e.g. Charizard"
                            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow shadow-sm"
                            autoComplete="off"
                            aria-label="Pokemon Name"
                            aria-autocomplete="list"
                            aria-controls="poke-results-list"
                            aria-activedescendant={activePokeSuggestionIndex >= 0 ? `poke-result-item-${activePokeSuggestionIndex}` : undefined}
                            aria-expanded={showPokeSuggestions}
                        />
                        {localPokemonName && (
                            <button
                                type="button"
                                onClick={clearPokemonName}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                aria-label="Clear pokemon name"
                            >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}

                        {/* Pokemon Suggestions Dropdown */}
                        {showPokeSuggestions && (
                            <div ref={pokeSuggestionRef} className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
                                {pokeSuggestions.length > 0 ? (
                                    <ul id="poke-results-list" role="listbox">
                                        {pokeSuggestions.map((suggestion, idx) => (
                                            <li 
                                                key={idx}
                                                id={`poke-result-item-${idx}`}
                                                role="option"
                                                aria-selected={idx === activePokeSuggestionIndex}
                                                onClick={() => handleSuggestionClick(suggestion, true)}
                                                className={`px-4 py-3 text-sm cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between transition-colors
                                                    ${idx === activePokeSuggestionIndex ? 'bg-primary-50 text-primary-900' : 'hover:bg-gray-50 text-gray-700'}`}
                                            >
                                                <span className="truncate">{highlightMatch(suggestion, localPokemonName)}</span>
                                                {idx === activePokeSuggestionIndex && (
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
                </section>

                {/* 1. Sort Order */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Sort By</h3>
                    <select 
                        value={localSort} 
                        onChange={(e) => setLocalSort(e.target.value as SortOption)}
                        className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        aria-label="Sort Order"
                    >
                        <option value={SortOption.NEWEST}>Newest Listed</option>
                        <option value={SortOption.ENDING_SOON}>Ending Soonest</option>
                        <option value={SortOption.PRICE_ASC}>Price: Low to High</option>
                        <option value={SortOption.PRICE_DESC}>Price: High to Low</option>
                        <option value={SortOption.MOST_BIDS}>Most Bids</option>
                    </select>
                </section>

                {/* 2. Product Category (Raw / Graded / Sealed) */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Product Category</h3>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setLocalCategory(undefined)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                                !localCategory ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            All
                        </button>
                        {Object.values(ProductCategory).map(cat => (
                            <button
                                type="button"
                                key={cat}
                                onClick={() => setLocalCategory(cat)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                                    localCategory === cat ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {cat === ProductCategory.RAW_CARD ? 'Raw' : (cat === ProductCategory.GRADED_CARD ? 'Graded' : 'Sealed')}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 2.5 Language */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Language</h3>
                    <select
                        value={localLanguage}
                        onChange={(e) => setLocalLanguage(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                        <option value="">Any Language</option>
                        {Object.values(Language).map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </section>

                {/* 5. Break Specific Filters (Only relevant for Breaks/Combined) */}
                {(appMode === AppMode.BREAKS || appMode === AppMode.COMBINED) && (
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-4">
                        <section>
                            <h3 className="text-sm font-bold text-purple-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                                <span className="text-lg">📺</span> Break Status
                            </h3>
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
                                            type="button"
                                            key={status.val}
                                            onClick={() => toggleFilter(status.val, setLocalBreakStatus)}
                                            aria-pressed={isSelected}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
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

                        <section>
                            <h3 className="text-sm font-bold text-purple-900 mb-3 uppercase tracking-wide">Booster / Product</h3>
                            <input
                                type="text"
                                value={localBoosterName}
                                onChange={(e) => setLocalBoosterName(e.target.value)}
                                placeholder="e.g. 151, Lost Origin, ETB..."
                                className="block w-full px-3 py-2 border border-purple-200 rounded-lg leading-5 bg-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                            />
                        </section>
                    </div>
                )}

                {/* 3. Era & Set (Dynamic from API) */}
                <section>
                    <div className="flex justify-between items-end mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Series & Set</h3>
                        {(localSeries.size > 0 || localSet.size > 0) && (
                            <button 
                                onClick={() => { setLocalSeries(new Set()); setLocalSet(new Set()); }}
                                className="text-[10px] text-red-600 hover:underline"
                            >
                                Reset Selection
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        {/* Series Selection - Multi Select Pills */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Era / Series</label>
                            <div className="flex flex-wrap gap-2">
                                {uniqueSeries.map(series => {
                                    const isSelected = localSeries.has(series);
                                    return (
                                        <button
                                            key={series}
                                            onClick={() => toggleFilter(series, setLocalSeries)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                                isSelected 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {series}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sets Selection - Multi Select Checkbox List */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Set / Expansion</label>
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-2 space-y-1 custom-scrollbar">
                                {visibleSets.length === 0 ? (
                                    <div className="text-xs text-gray-400 text-center py-4">No sets available</div>
                                ) : (
                                    visibleSets.map(set => (
                                        <label key={set.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white rounded-md transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={localSet.has(set.id)}
                                                onChange={() => {
                                                    toggleFilter(set.id, setLocalSet);
                                                    // Optional: If auto-selecting series is desired when checking a set
                                                    // But multi-select logic usually implies independent control or strict hierarchy
                                                    if (!localSeries.has(set.series)) {
                                                        setLocalSeries(prev => new Set(prev).add(set.series));
                                                    }
                                                }}
                                                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-gray-700 truncate">{set.name}</div>
                                                <div className="text-[10px] text-gray-400 flex justify-between">
                                                    <span>{set.series}</span>
                                                    <span>{set.total} cards</span>
                                                </div>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Price Range */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                        {appMode === AppMode.BREAKS ? 'Entry Price ($)' : 'Price Range ($)'}
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                            <input 
                                type="number" 
                                placeholder="Min" 
                                value={localPriceMin} 
                                onChange={(e) => setLocalPriceMin(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 pl-6 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                                className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 pl-6 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                aria-label="Max Price"
                            />
                        </div>
                    </div>
                </section>

                {/* 6. Pokemon Types (Chips) */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Pokemon Type</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.values(PokemonType).map(type => {
                            const isSelected = localPokemonTypes.has(type);
                            return (
                                <button
                                    type="button"
                                    key={type}
                                    onClick={() => toggleFilter(type, setLocalPokemonTypes)}
                                    aria-pressed={isSelected}
                                    className={`px-2 py-2 rounded-md text-xs font-bold transition-all border shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
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
                                    type="button"
                                    key={cat}
                                    onClick={() => toggleFilter(cat, setLocalCardCategories)}
                                    aria-pressed={isSelected}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
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
                             <label key={tag} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-md transition-colors border border-transparent hover:border-gray-200 focus-within:ring-2 focus-within:ring-primary-500">
                                 <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localVariantTags.has(tag) ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}>
                                     {localVariantTags.has(tag) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                 </div>
                                 <input 
                                    type="checkbox" 
                                    checked={localVariantTags.has(tag)}
                                    onChange={() => toggleFilter(tag, setLocalVariantTags)}
                                    className="opacity-0 w-0 h-0 absolute"
                                 />
                                 <span className="text-sm text-gray-700 font-medium">{TAG_DISPLAY_LABELS[tag] || tag}</span>
                             </label>
                         ))}
                    </div>
                </section>

                {/* 9. Grading Company - Moved to always visible since often requested */}
                <section>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Grading Company</h3>
                        <div className="flex flex-wrap gap-2">
                        {Object.values(GradingCompany).map(company => {
                            const isSelected = localGradingCompany.has(company);
                            return (
                                <button
                                    type="button"
                                    key={company}
                                    onClick={() => toggleFilter(company, setLocalGradingCompany)}
                                    aria-pressed={isSelected}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                        isSelected ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {company}
                                </button>
                            );
                        })}
                        </div>
                </section>

                {/* 10. Conditional Fields based on Category */}
                {localCategory === ProductCategory.RAW_CARD && (
                    <section>
                         <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Condition</h3>
                         <div className="flex flex-wrap gap-2">
                            {Object.values(Condition).map(c => {
                                const isSelected = localCondition.has(c);
                                return (
                                    <button
                                        type="button"
                                        key={c}
                                        onClick={() => toggleFilter(c, setLocalCondition)}
                                        aria-pressed={isSelected}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
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

                {localCategory === ProductCategory.SEALED_PRODUCT && (
                    <section>
                         <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Product Type</h3>
                         <div className="grid grid-cols-2 gap-2">
                            {Object.values(SealedProductType).map(type => (
                                <label key={type} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-md transition-colors border border-transparent hover:border-gray-200 focus-within:ring-2 focus-within:ring-primary-500">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localSealedProductType.has(type) ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}>
                                        {localSealedProductType.has(type) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={localSealedProductType.has(type)}
                                        onChange={() => toggleFilter(type, setLocalSealedProductType)}
                                        className="opacity-0 w-0 h-0 absolute"
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
                    type="button"
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
