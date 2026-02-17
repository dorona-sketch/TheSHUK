
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { PokemonType, VariantTag, CardCategory, Condition, SortOption, ProductCategory, GradingCompany, SealedProductType, SearchScope, BreakStatus, AppMode, Language, ListingType, Listing, TcgSet } from '../types';
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
    [SearchScope.ALL]: 'All',
    [SearchScope.TITLE]: 'Title',
    [SearchScope.POKEMON]: 'Pokemon',
    [SearchScope.SET]: 'Set',
    [SearchScope.SELLER]: 'Seller',
    [SearchScope.BOOSTER]: 'Booster'
};

const COMMON_GRADES = ['10', '9.5', '9', '8.5', '8', '7', '6', '5', '4', '3', '2', '1'];

const ERA_ORDER = [
    'Vintage (WOTC)',
    'EX Era',
    'Diamond & Pearl',
    'Black & White',
    'XY',
    'Sun & Moon',
    'Sword & Shield',
    'Scarlet & Violet'
] as const;

const getPokemonEra = (releaseDate?: string) => {
    const year = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : NaN;
    if (Number.isNaN(year)) return '';
    if (year <= 2002) return 'Vintage (WOTC)';
    if (year <= 2006) return 'EX Era';
    if (year <= 2010) return 'Diamond & Pearl';
    if (year <= 2013) return 'Black & White';
    if (year <= 2016) return 'XY';
    if (year <= 2019) return 'Sun & Moon';
    if (year <= 2022) return 'Sword & Shield';
    return 'Scarlet & Violet';
};

const normalizeSearchText = (value: string) => {
    let text = value.toLowerCase();
    const synonymMap: Record<string, string> = {
        'zard': 'charizard',
        'pika': 'pikachu',
        'nm': 'near mint',
        'lp': 'light played',
        'mp': 'moderately played',
        'hp': 'heavily played',
        '1st ed': 'first edition',
        'fa': 'full art',
        'aa': 'alternate art'
    };
    Object.entries(synonymMap).forEach(([from, to]) => {
        text = text.replace(new RegExp(`\b${from.replace(/[-/\^$*+?.()|[\]{}]/g, '\\$&')}\b`, 'g'), to);
    });
    return text;
};


export const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose }) => {
  const { filters, setFilter, sortOption, setSortOption, resetFilters, getSuggestions, appMode, availableSets, listings } = useStore();

  // --- Local State for Atomic Updates ---
  // Using Sets ensures O(1) lookup complexity for selections
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);
  const [localScope, setLocalScope] = useState<SearchScope>(filters.searchScope || SearchScope.ALL);
  const [localSort, setLocalSort] = useState<SortOption>(sortOption);
  
  // Text Filters
  const [localPokemonName, setLocalPokemonName] = useState<string>(filters.pokemonName || '');
  const [localBoosterName, setLocalBoosterName] = useState<string>(filters.boosterName || '');
  const [localDescriptionQuery, setLocalDescriptionQuery] = useState<string>(filters.descriptionQuery || '');
  const [localLanguage, setLocalLanguage] = useState<string>(filters.language || '');
  
  // Set-based Multi-Select Filters
  const [localSeries, setLocalSeries] = useState<Set<string>>(new Set(filters.series || []));
  const [localSet, setLocalSet] = useState<Set<string>>(new Set(filters.set || []));
  const [localEras, setLocalEras] = useState<Set<string>>(new Set(filters.eras || []));
  const [localListingTypes, setLocalListingTypes] = useState<Set<ListingType>>(new Set(filters.listingTypes || []));

  const [localPokemonTypes, setLocalPokemonTypes] = useState<Set<PokemonType>>(new Set(filters.pokemonTypes || []));
  const [localCardCategories, setLocalCardCategories] = useState<Set<CardCategory>>(new Set(filters.cardCategories || []));
  const [localVariantTags, setLocalVariantTags] = useState<Set<VariantTag>>(new Set(filters.variantTags || []));
  
  const [localCondition, setLocalCondition] = useState<Set<Condition>>(new Set(filters.condition || []));
  const [localGradingCompany, setLocalGradingCompany] = useState<Set<GradingCompany>>(new Set(filters.gradingCompany || []));
  const [localGrades, setLocalGrades] = useState<Set<string>>(new Set(filters.grades || []));
  const [localSealedProductType, setLocalSealedProductType] = useState<Set<SealedProductType>>(new Set(filters.sealedProductType || []));

  const [localCategory, setLocalCategory] = useState<ProductCategory | undefined>(filters.category);

  const [localBreakStatus, setLocalBreakStatus] = useState<Set<BreakStatus>>(new Set(filters.breakStatus || []));
  const [localPriceMin, setLocalPriceMin] = useState<string>(filters.priceRange.min?.toString() || '');
  const [localPriceMax, setLocalPriceMax] = useState<string>(filters.priceRange.max?.toString() || '');

  const [savedPresets, setSavedPresets] = useState<{ name: string; data: any }[]>([]);

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

  // Sync local state with global state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocalSearch(filters.searchQuery);
      setLocalScope(filters.searchScope || SearchScope.ALL);
      setLocalSort(sortOption);
      
      setLocalPokemonName(filters.pokemonName || '');
      setLocalBoosterName(filters.boosterName || '');
      setLocalDescriptionQuery(filters.descriptionQuery || '');
      setLocalLanguage(filters.language || '');
      setLocalSeries(new Set(filters.series || []));
      setLocalSet(new Set(filters.set || []));
      setLocalEras(new Set(filters.eras || []));
      setLocalListingTypes(new Set(filters.listingTypes || []));

      setLocalPokemonTypes(new Set(filters.pokemonTypes || []));
      setLocalCardCategories(new Set(filters.cardCategories || []));
      setLocalVariantTags(new Set(filters.variantTags || []));
      setLocalCondition(new Set(filters.condition || []));
      setLocalGradingCompany(new Set(filters.gradingCompany || []));
      setLocalGrades(new Set(filters.grades || []));
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
          previousFocusRef.current = document.activeElement as HTMLElement;
          
          const focusable = drawerRef.current?.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusable && focusable.length > 0) {
              const searchInput = drawerRef.current?.querySelector('input');
              if (searchInput) {
                  (searchInput as HTMLElement).focus();
              } else {
                  (focusable[0] as HTMLElement).focus();
              }
          }
          document.body.style.overflow = 'hidden';
      } else {
          if (previousFocusRef.current) {
              previousFocusRef.current.focus();
          }
          document.body.style.overflow = '';
      }
      return () => { document.body.style.overflow = ''; };
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

              if (e.shiftKey) { 
                  if (document.activeElement === firstElement) {
                      e.preventDefault();
                      lastElement.focus();
                  }
              } else { 
                  if (document.activeElement === lastElement) {
                      e.preventDefault();
                      firstElement.focus();
                  }
              }
          }
      };

      if (isOpen) window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
      try {
          const raw = localStorage.getItem('shuk_filter_presets');
          if (raw) setSavedPresets(JSON.parse(raw));
      } catch (e) {
          console.warn('Could not load presets', e);
      }
  }, []);

  // --- Derived Data ---
  const effectiveSets = useMemo<TcgSet[]>(() => {
      if (availableSets.length > 0) return availableSets;
      const map = new Map<string, TcgSet>();
      listings.forEach((l: Listing) => {
          if (!l.setId || !l.setName) return;
          map.set(l.setId, {
              id: l.setId,
              name: l.setName,
              series: l.series || 'Unknown Series',
              printedTotal: 0,
              total: 0,
              releaseDate: l.releaseDate || `${l.releaseYear || '2000'}-01-01`,
              images: { symbol: '', logo: '' }
          });
      });
      return Array.from(map.values());
  }, [availableSets, listings]);

  const uniqueSeries = useMemo(() => {
      const series = new Set(effectiveSets.map(s => s.series));
      return Array.from(series).sort();
  }, [effectiveSets]);

  const uniqueEras = useMemo(() => {
      const eras = new Set(effectiveSets.map(s => getPokemonEra(s.releaseDate)).filter(Boolean));
      return ERA_ORDER.filter(era => eras.has(era));
  }, [effectiveSets]);

  const visibleSets = useMemo(() => {
      let sets = effectiveSets;
      if (localEras.size > 0) {
          sets = sets.filter(s => localEras.has(getPokemonEra(s.releaseDate)));
      }
      if (localSeries.size > 0) {
          sets = sets.filter(s => localSeries.has(s.series));
      }
      return sets.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [effectiveSets, localSeries, localEras]);

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
      }, 250);
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
          if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node) && 
              searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
              setShowSuggestions(false);
          }
          if (pokeSuggestionRef.current && !pokeSuggestionRef.current.contains(event.target as Node) && 
              pokeInputRef.current && !pokeInputRef.current.contains(event.target as Node)) {
              setShowPokeSuggestions(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Core Toggle Logic (O(1) complexity) ---
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

  // --- Keyboard Navigation ---
  const handleInputKeyDown = (e: React.KeyboardEvent, isPokemonSearch: boolean = false) => {
      const isShowing = isPokemonSearch ? showPokeSuggestions : showSuggestions;
      const suggestionsList = isPokemonSearch ? pokeSuggestions : suggestions;
      const activeIndex = isPokemonSearch ? activePokeSuggestionIndex : activeSuggestionIndex;
      const setIndex = isPokemonSearch ? setActivePokeSuggestionIndex : setActiveSuggestionIndex;
      const setShow = isPokemonSearch ? setShowPokeSuggestions : setShowSuggestions;

      if (!isShowing) {
          if (e.key === 'ArrowDown') setShow(true);
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
          e.stopPropagation();
          setShow(false);
      }
  };

  const handleApply = () => {
    // Commit all local states to global store
    setFilter('searchQuery', localSearch);
    setFilter('searchScope', localScope); 
    setSortOption(localSort);
    
    setFilter('pokemonName', localPokemonName);
    setFilter('boosterName', localBoosterName);
    setFilter('descriptionQuery', localDescriptionQuery);
    setFilter('language', localLanguage);
    
    // Convert Sets back to arrays for global store interface
    setFilter('series', Array.from(localSeries));
    setFilter('set', Array.from(localSet));
    setFilter('eras', Array.from(localEras));
    setFilter('listingTypes', appMode === AppMode.MARKETPLACE ? Array.from(localListingTypes) : []);
    setFilter('pokemonTypes', appMode === AppMode.BREAKS ? [] : Array.from(localPokemonTypes));
    setFilter('cardCategories', appMode === AppMode.BREAKS ? [] : Array.from(localCardCategories));
    setFilter('variantTags', appMode === AppMode.BREAKS ? [] : Array.from(localVariantTags));
    setFilter('condition', appMode === AppMode.BREAKS ? [] : Array.from(localCondition));
    setFilter('gradingCompany', appMode === AppMode.BREAKS ? [] : Array.from(localGradingCompany));
    setFilter('grades', appMode === AppMode.BREAKS ? [] : Array.from(localGrades));
    setFilter('sealedProductType', appMode === AppMode.BREAKS ? [] : Array.from(localSealedProductType));
    setFilter('breakStatus', appMode === AppMode.BREAKS ? Array.from(localBreakStatus) : []);
    
    setFilter('category', localCategory);
    
    setFilter('priceRange', {
        min: localPriceMin ? parseFloat(localPriceMin) : null,
        max: localPriceMax ? parseFloat(localPriceMax) : null
    });

    onClose();
  };

  const handleGlobalReset = () => {
      resetFilters();
      setSortOption(SortOption.NEWEST);
      
      // Reset Local State to match
      setLocalSearch('');
      setLocalScope(SearchScope.ALL);
      setLocalSort(SortOption.NEWEST);
      setLocalPokemonName('');
      setLocalBoosterName('');
      setLocalDescriptionQuery('');
      setLocalLanguage('');
      setLocalSeries(new Set());
      setLocalSet(new Set());
      setLocalEras(new Set());
      setLocalListingTypes(new Set());
      setLocalPokemonTypes(new Set());
      setLocalCardCategories(new Set());
      setLocalVariantTags(new Set());
      setLocalCondition(new Set());
      setLocalGradingCompany(new Set());
      setLocalGrades(new Set());
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
          // Smart Fill: Check if suggestion is a Set Name
          const matchedSet = effectiveSets.find(s => s.name.toLowerCase() === value.toLowerCase());
          if (matchedSet) {
              setLocalSet(new Set([matchedSet.id]));
              setLocalSeries(new Set([matchedSet.series]));
              const era = getPokemonEra(matchedSet.releaseDate);
              if (era) setLocalEras(new Set([era]));
              setLocalSearch('');
          } else {
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
      <div 
        className="absolute inset-0 bg-gray-600 bg-opacity-50 transition-opacity backdrop-blur-sm" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      <div className="fixed inset-y-0 right-0 flex max-w-full pointer-events-none">
        <div 
            ref={drawerRef}
            className="w-screen max-w-md pointer-events-auto flex flex-col bg-white shadow-2xl transform transition-transform ease-in-out duration-300 h-full safe-area-pt safe-area-px"
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
                
                {/* Search */}
                <section className="relative z-20">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Search</h3>
                    <div className="flex flex-col gap-2">
                        <div className="relative group flex">
                            <div className="relative bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg hover:bg-gray-200 transition-colors">
                                <select 
                                    value={localScope}
                                    onChange={(e) => setLocalScope(e.target.value as SearchScope)}
                                    className="appearance-none bg-transparent py-2.5 pl-3 pr-8 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer h-full"
                                    style={{ textAlignLast: 'center' }}
                                >
                                    {Object.values(SearchScope).map(scope => (
                                        <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            <div className="relative flex-1">
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
                                    onFocus={() => { if (localSearch) setShowSuggestions(true); }}
                                    placeholder={`Search by ${SCOPE_LABELS[localScope]}...`}
                                    className="block w-full py-2.5 px-3 border border-gray-300 rounded-r-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow shadow-sm z-10"
                                    autoComplete="off"
                                    aria-expanded={showSuggestions}
                                />
                                {localSearch && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer z-20"
                                        aria-label="Clear search"
                                    >
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {showSuggestions && (
                                <div ref={suggestionRef} className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
                                    {suggestions.length > 0 ? (
                                        <ul role="listbox">
                                            {suggestions.map((suggestion, idx) => {
                                                const isSet = availableSets.some(s => s.name.toLowerCase() === suggestion.toLowerCase());
                                                return (
                                                    <li 
                                                        key={idx}
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
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-400 text-center italic">No matches found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Specific Pokemon Filter */}
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
                            onFocus={() => { if (localPokemonName) setShowPokeSuggestions(true); }}
                            placeholder="e.g. Charizard"
                            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow shadow-sm"
                            autoComplete="off"
                            aria-expanded={showPokeSuggestions}
                        />
                        {localPokemonName && (
                            <button
                                type="button"
                                onClick={clearPokemonName}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                        {showPokeSuggestions && (
                            <div ref={pokeSuggestionRef} className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
                                {pokeSuggestions.length > 0 ? (
                                    <ul role="listbox">
                                        {pokeSuggestions.map((suggestion, idx) => (
                                            <li 
                                                key={idx}
                                                role="option"
                                                aria-selected={idx === activePokeSuggestionIndex}
                                                onClick={() => handleSuggestionClick(suggestion, true)}
                                                className={`px-4 py-3 text-sm cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between transition-colors
                                                    ${idx === activePokeSuggestionIndex ? 'bg-primary-50 text-primary-900' : 'hover:bg-gray-50 text-gray-700'}`}
                                            >
                                                <span className="truncate">{highlightMatch(suggestion, localPokemonName)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-400 text-center italic">No matches found</div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* Sort */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Sort By</h3>
                    <select 
                        value={localSort} 
                        onChange={(e) => setLocalSort(e.target.value as SortOption)}
                        className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                        <option value={SortOption.NEWEST}>Newest Listed</option>
                        <option value={SortOption.ENDING_SOON}>Ending Soonest</option>
                        <option value={SortOption.PRICE_ASC}>Price: Low to High</option>
                        <option value={SortOption.PRICE_DESC}>Price: High to Low</option>
                        <option value={SortOption.MOST_BIDS}>Most Bids</option>
                    </select>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Description Contains</h3>
                    <input
                        type="text"
                        value={localDescriptionQuery}
                        onChange={(e) => setLocalDescriptionQuery(e.target.value)}
                        placeholder="e.g. near mint, swirl, first edition"
                        className="w-full border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </section>

                {appMode === AppMode.MARKETPLACE && (
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Listing Mode</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[ListingType.DIRECT_SALE, ListingType.AUCTION].map(t => {
                                const count = listings.filter(l => l.type === t).length;
                                const selected = localListingTypes.has(t);
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => toggleFilter(t, setLocalListingTypes)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold border ${selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {t === ListingType.AUCTION ? 'Auction' : 'Buy Now'} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Product Category */}
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

                {/* Series & Set */}
                <section>
                    <div className="flex justify-between items-end mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Series & Set</h3>
                        {(localSeries.size > 0 || localSet.size > 0 || localEras.size > 0) && (
                            <button 
                                onClick={() => { setLocalSeries(new Set()); setLocalSet(new Set()); setLocalEras(new Set()); }}
                                className="text-[10px] text-red-600 hover:underline"
                            >
                                Reset Selection
                            </button>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Era</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {uniqueEras.map(era => {
                                    const isSelected = localEras.has(era);
                                    const eraCount = listings.filter(l => getPokemonEra(l.releaseDate || `${l.releaseYear || ''}-01-01`) === era).length;
                                    return (
                                        <button
                                            key={era}
                                            onClick={() => toggleFilter(era, setLocalEras)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                                isSelected
                                                ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-md'
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {era} ({eraCount})
                                        </button>
                                    );
                                })}
                            </div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Series</label>
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
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Set / Expansion</label>
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-2 space-y-1 custom-scrollbar">
                                {visibleSets.map(set => (
                                    <label key={set.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white rounded-md transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={localSet.has(set.id)}
                                            onChange={() => {
                                                toggleFilter(set.id, setLocalSet);
                                                if (!localSeries.has(set.series)) {
                                                    setLocalSeries(prev => new Set(prev).add(set.series));
                                                }
                                                const era = getPokemonEra(set.releaseDate);
                                                if (era && !localEras.has(era)) {
                                                    setLocalEras(prev => new Set(prev).add(era));
                                                }
                                            }}
                                            className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-gray-700 truncate">{set.name}</div>
                                            <div className="text-[10px] text-gray-400 flex justify-between">
                                                <span>{set.series}</span>
                                                <span>{getPokemonEra(set.releaseDate)}</span>
                                                <span>{set.total} cards</span>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {appMode !== AppMode.BREAKS && (
                <>
                {/* Pokemon Types */}
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

                {/* Categories & Variants */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Category & Rarity</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                         {Object.values(CardCategory).map(cat => (
                             <button
                                type="button"
                                key={cat}
                                onClick={() => toggleFilter(cat, setLocalCardCategories)}
                                aria-pressed={localCardCategories.has(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                    localCardCategories.has(cat)
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                             >
                                 {cat}
                             </button>
                         ))}
                    </div>
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

                {/* Grading Company */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Grading</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
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

                    {/* NEW: Grades Sub-section */}
                    {(localCategory === ProductCategory.GRADED_CARD || localGradingCompany.size > 0 || !localCategory) && (
                        <div className="pt-2 border-t border-gray-100 border-dashed">
                            <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase mt-2">Grade / Score</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {COMMON_GRADES.map(g => {
                                    const isSelected = localGrades.has(g);
                                    return (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => toggleFilter(g, setLocalGrades)}
                                            className={`px-1 py-2 rounded text-xs font-bold border transition-colors ${
                                                isSelected 
                                                ? 'bg-blue-600 text-white border-blue-600' 
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                {/* Conditional Fields */}
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

                                </>
                )}

                {appMode === AppMode.BREAKS && (
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Break Status</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(BreakStatus).map(status => {
                                const selected = localBreakStatus.has(status);
                                const count = listings.filter(l => l.breakStatus === status).length;
                                return (
                                    <button
                                        type="button"
                                        key={status}
                                        onClick={() => toggleFilter(status, setLocalBreakStatus)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {status} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Price Range */}
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
                            />
                        </div>
                    </div>
                </section>
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
