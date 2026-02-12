
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Navbar } from './components/Navbar';
import { ListingCard } from './components/ListingCard';
import { Listing, ListingType, ProductCategory, AppMode, Group, Thread, BreakStatus } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load larger views to split bundle size
const CombinedHome = React.lazy(() => import('./components/CombinedHome').then(m => ({ default: m.CombinedHome })));
const ListingDetailView = React.lazy(() => import('./components/ListingDetailView').then(m => ({ default: m.ListingDetailView })));
const LoginForm = React.lazy(() => import('./components/auth/LoginForm').then(m => ({ default: m.LoginForm })));
const RegisterForm = React.lazy(() => import('./components/auth/RegisterForm').then(m => ({ default: m.RegisterForm })));
const ForgotPasswordForm = React.lazy(() => import('./components/auth/ForgotPasswordForm').then(m => ({ default: m.ForgotPasswordForm }))); // New View
const UserProfile = React.lazy(() => import('./components/profile/UserProfile').then(m => ({ default: m.UserProfile })));
const Inbox = React.lazy(() => import('./components/chat/Inbox').then(m => ({ default: m.Inbox })));
const ChatThread = React.lazy(() => import('./components/chat/ChatThread').then(m => ({ default: m.ChatThread })));
const LiveSession = React.lazy(() => import('./components/live/LiveSession').then(m => ({ default: m.LiveSession })));
const SellerDashboard = React.lazy(() => import('./components/dashboard/SellerDashboard').then(m => ({ default: m.SellerDashboard })));

// Community Views
const CommunityHub = React.lazy(() => import('./components/community/CommunityHub').then(m => ({ default: m.CommunityHub })));
const GroupView = React.lazy(() => import('./components/community/GroupView').then(m => ({ default: m.GroupView })));
const ThreadView = React.lazy(() => import('./components/community/ThreadView').then(m => ({ default: m.ThreadView })));

// Lazy load Modals & Heavy Components
const AddListingModal = React.lazy(() => import('./components/AddListingModal').then(m => ({ default: m.AddListingModal })));
const FilterDrawer = React.lazy(() => import('./components/FilterDrawer').then(m => ({ default: m.FilterDrawer })));
const BidModal = React.lazy(() => import('./components/bids/BidModal').then(m => ({ default: m.BidModal })));

type ViewState = 'HOME' | 'MARKETPLACE' | 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'PROFILE' | 'CHAT' | 'DETAILS' | 'LIVE' | 'DASHBOARD' | 'COMMUNITY' | 'COMMUNITY_GROUP' | 'COMMUNITY_THREAD';

const PageLoader = () => (
    <div className="flex justify-center items-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
);

const PokeVaultContent = () => {
  const { 
    filteredListings, listings, currentUser, addListing, updateListing, placeBid, buyNow, joinBreak,
    getBidsByListingId, loading, filters, setFilter, appMode, setAppMode, groups, threads
  } = useStore();

  const { startConversation, activeConversation, selectConversation } = useChat();
  
  // View State Management
  const [currentView, setCurrentView] = useState<ViewState>('MARKETPLACE');
  const [previousView, setPreviousView] = useState<ViewState | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null); // For Edit Flow
  
  // Community Selection State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Tab State for Combined Mode (Marketplace vs Breaks list)
  const [combinedTab, setCombinedTab] = useState<'MARKET' | 'BREAKS'>('MARKET');
  
  // Modals state
  const [isAddListingModalOpen, setAddListingModalOpen] = useState(false);
  const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  const [bidModalState, setBidModalState] = useState<{isOpen: boolean, listing: Listing | null}>({
      isOpen: false,
      listing: null
  });

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // --- CRITICAL: Sync selectedListing with global store updates ---
  useEffect(() => {
      if (selectedListing) {
          const freshListing = listings.find(l => l.id === selectedListing.id);
          if (freshListing && freshListing !== selectedListing) {
              setSelectedListing(freshListing);
          }
      }
  }, [listings, selectedListing]);

  // --- CRITICAL: Sync BidModal Listing ---
  useEffect(() => {
      if (bidModalState.isOpen && bidModalState.listing) {
          const freshListing = listings.find(l => l.id === bidModalState.listing?.id);
          if (freshListing && freshListing !== bidModalState.listing) {
              setBidModalState(prev => ({ ...prev, listing: freshListing }));
          }
      }
  }, [listings, bidModalState.isOpen, bidModalState.listing]);

  // --- ROUTING / NAVIGATION LOGIC ---
  useEffect(() => {
      const syncRoute = () => {
          try {
              const params = new URLSearchParams(window.location.search);
              const viewParam = params.get('view');
              const idParam = params.get('id');

              if (viewParam) {
                  if ((viewParam === 'DETAILS' || viewParam === 'LIVE') && idParam) {
                      const target = listings.find(l => l.id === idParam);
                      if (target) {
                          setSelectedListing(target);
                          setCurrentView(viewParam as ViewState);
                          
                          // Handle Mode Mismatch for Deep Links
                          if (target.type === ListingType.TIMED_BREAK && appMode === AppMode.MARKETPLACE) {
                              setAppMode(AppMode.BREAKS);
                              showNotification("Switched to Breaks mode to view this listing.", "success");
                          } else if (target.type !== ListingType.TIMED_BREAK && appMode === AppMode.BREAKS) {
                              setAppMode(AppMode.MARKETPLACE);
                              showNotification("Switched to Marketplace mode to view this listing.", "success");
                          }
                      } else {
                          // Fallback if ID invalid
                          setCurrentView(appMode === AppMode.COMBINED ? 'HOME' : 'MARKETPLACE');
                      }
                  } else if (viewParam === 'COMMUNITY_GROUP' && idParam) {
                      setSelectedGroupId(idParam);
                      setCurrentView('COMMUNITY_GROUP');
                  } else if (viewParam === 'COMMUNITY_THREAD' && idParam) {
                      setSelectedThreadId(idParam);
                      setCurrentView('COMMUNITY_THREAD');
                  } else if (['HOME', 'LOGIN', 'REGISTER', 'FORGOT_PASSWORD', 'PROFILE', 'CHAT', 'MARKETPLACE', 'DASHBOARD', 'COMMUNITY'].includes(viewParam)) {
                      setCurrentView(viewParam as ViewState);
                  }
              } else {
                  if (appMode === AppMode.COMBINED) setCurrentView('HOME');
                  else setCurrentView('MARKETPLACE');
              }
          } catch (e) {
              console.warn("Route sync failed:", e);
              setCurrentView('MARKETPLACE');
          }
      };

      syncRoute();
      window.addEventListener('popstate', syncRoute);
      return () => window.removeEventListener('popstate', syncRoute);

  }, [listings, appMode, setAppMode, showNotification]);

  const navigateTo = useCallback((view: ViewState, id?: string) => {
      setCurrentView(view);
      
      try {
          const params = new URLSearchParams(window.location.search);
          params.set('view', view);
          if (id) params.set('id', id);
          else params.delete('id');
          
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.pushState({ path: newUrl }, '', newUrl);
      } catch (e) {
          console.debug("Router: Could not update URL history (likely sandboxed)", e);
      }

      if (view !== 'DETAILS' && view !== 'LIVE') {
          try {
              window.scrollTo(0, 0);
          } catch (e) { /* ignore */ }
      }
  }, []);

  const handleAuthSuccess = useCallback(() => {
      if (appMode === AppMode.COMBINED) navigateTo('HOME');
      else navigateTo('MARKETPLACE');
      setNotification({ message: "Welcome back!", type: 'success' });
      setTimeout(() => setNotification(null), 3000);
  }, [appMode, navigateTo]);

  React.useEffect(() => {
      if (!currentUser && (currentView === 'PROFILE' || currentView === 'CHAT' || currentView === 'DASHBOARD')) {
          navigateTo('LOGIN');
      }
  }, [currentUser, currentView, navigateTo]);

  const handleViewListing = useCallback((listing: Listing) => {
      setPreviousView(currentView);
      setSelectedListing(listing);
      navigateTo('DETAILS', listing.id);
      window.scrollTo(0, 0);
  }, [currentView, navigateTo]);

  const handleWatchLive = useCallback((listing: Listing) => {
      setPreviousView('DETAILS');
      setSelectedListing(listing);
      navigateTo('LIVE', listing.id);
  }, [navigateTo]);

  const handleBackFromDetails = useCallback(() => {
      if (previousView && previousView !== 'LIVE') {
          navigateTo(previousView);
      } else {
          if (appMode === AppMode.COMBINED) navigateTo('HOME');
          else navigateTo('MARKETPLACE');
      }
  }, [previousView, appMode, navigateTo]);

  const handleBackFromLive = useCallback(() => {
      if (selectedListing) {
          navigateTo('DETAILS', selectedListing.id);
      } else {
          handleBackFromDetails();
      }
  }, [selectedListing, navigateTo, handleBackFromDetails]);

  // --- Community Navigation Handlers ---
  const handleNavigateGroup = useCallback((groupId: string) => {
      setSelectedGroupId(groupId);
      navigateTo('COMMUNITY_GROUP', groupId);
  }, [navigateTo]);

  const handleNavigateThread = useCallback((threadId: string) => {
      setSelectedThreadId(threadId);
      navigateTo('COMMUNITY_THREAD', threadId);
  }, [navigateTo]);

  const handleBackToCommunity = useCallback(() => {
      navigateTo('COMMUNITY');
  }, [navigateTo]);

  const handleBackToGroup = useCallback(() => {
      if (selectedGroupId) {
          navigateTo('COMMUNITY_GROUP', selectedGroupId);
      } else {
          navigateTo('COMMUNITY');
      }
  }, [selectedGroupId, navigateTo]);


  const handleInteraction = useCallback(async (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => {
    if (!currentUser) {
        showNotification("Please sign in.", 'error');
        navigateTo('LOGIN');
        return;
    }

    const isOwner = listing.sellerId === currentUser.id;

    if (action === 'MANAGE') {
        if (!isOwner) {
            showNotification("Only the seller can manage this listing.", 'error');
            return;
        }
        
        // Smart Routing for Seller Management
        // 1. If it's a Break in an active lifecycle stage (Ready, Live, Done), go to Details/Dashboard
        // 2. If it's a Standard Listing or an Open Break (not full), go to Edit Modal
        
        const manageOnDetailsPage = [
            BreakStatus.FULL_PENDING_SCHEDULE, 
            BreakStatus.SCHEDULED, 
            BreakStatus.LIVE, 
            BreakStatus.COMPLETED,
            BreakStatus.CANCELLED
        ];
        
        const shouldGoToDetails = listing.type === ListingType.TIMED_BREAK && 
                                listing.breakStatus && 
                                manageOnDetailsPage.includes(listing.breakStatus);

        if (shouldGoToDetails) {
            handleViewListing(listing);
            return;
        }

        // For standard listings or open breaks, open the edit modal
        setEditingListing(listing);
        setAddListingModalOpen(true);
        return;
    }

    // Specific Seller Restriction: Block BUY and BID on own items
    // Allow CHAT (useful for preview/testing) and MANAGE (handled above)
    if (isOwner && (action === 'BUY' || action === 'BID')) {
        showNotification("Sellers cannot bid on or buy their own items.", 'error');
        return;
    }

    if (action === 'CHAT') {
        const seller = { 
            id: listing.sellerId, 
            name: listing.sellerName,
            avatar: listing.sellerAvatar 
        } as any; 
        
        await startConversation(listing, seller).then(c => {
            selectConversation(c.id);
            navigateTo('CHAT');
        });
        return;
    }

    if (action === 'BID') {
        setBidModalState({ isOpen: true, listing: listing });
        return;
    }

    if (action === 'BUY') {
        if (listing.type === ListingType.TIMED_BREAK) {
             if(confirm(`Join break for $${listing.price}? (Auth Hold)`)) {
                 try {
                     const result = await joinBreak(listing.id);
                     showNotification(result.message, result.success ? 'success' : 'error');
                 } catch (e) {
                     showNotification("Failed to join break.", 'error');
                 }
             }
        } else {
            if(confirm(`Buy ${listing.title} for $${listing.price}?`)) {
                try {
                    const result = buyNow(listing.id);
                    showNotification(result.message, result.success ? 'success' : 'error');
                    if (result.success) navigateTo(previousView || 'MARKETPLACE');
                } catch (e) {
                    showNotification("Purchase failed.", 'error');
                }
            }
        }
    }
  }, [currentUser, startConversation, selectConversation, navigateTo, joinBreak, buyNow, previousView, showNotification, currentView, handleViewListing]);

  const handlePlaceBidSubmit = useCallback((amount: number) => {
      if (!bidModalState.listing) return { success: false, message: 'No listing selected' };
      const result = placeBid(bidModalState.listing.id, amount);
      if (result.success) showNotification(result.message, 'success');
      return result;
  }, [bidModalState.listing, placeBid, showNotification]);

  const handleNavbarNavigate = useCallback((view: any) => {
      navigateTo(view);
      if (view !== 'DETAILS' && view !== 'LIVE') setSelectedListing(null);
  }, [navigateTo]);

  const handleSellClick = useCallback(() => {
      if (!currentUser) {
          showNotification("Please sign in to list items.", 'error');
          navigateTo('LOGIN');
          return;
      }
      setEditingListing(null);
      setAddListingModalOpen(true);
  }, [currentUser, navigateTo, showNotification]);

  const handleAddOrEditListing = (data: any) => {
      if (editingListing) {
          updateListing(editingListing.id, data);
          showNotification("Listing updated successfully!", "success");
          setEditingListing(null);
      } else {
          addListing(data);
          showNotification("Listing created successfully!", "success");
      }
      setAddListingModalOpen(false);
  };

  const activeFilterCount = 
      filters.gradingCompany.length
      + filters.sealedProductType.length
      + filters.condition.length
      + filters.pokemonTypes.length 
      + filters.cardCategories.length 
      + filters.variantTags.length
      + filters.breakStatus.length
      + (filters.priceRange.min !== null || filters.priceRange.max !== null ? 1 : 0);

  const getActiveListings = () => {
      // Logic Update: Use `filteredListings` which is already search/filter compliant
      // Then apply view-specific type filtering if needed (like Combined Tab)
      
      // If mode is MARKETPLACE, context already filters out Breaks
      // If mode is BREAKS, context already filters out Market items
      
      // If mode is COMBINED, context has everything. We need to filter by current TAB.
      if (appMode === AppMode.COMBINED) {
          if (combinedTab === 'MARKET') {
              return filteredListings.filter(l => l.type !== ListingType.TIMED_BREAK);
          } else {
              return filteredListings.filter(l => l.type === ListingType.TIMED_BREAK);
          }
      }
      
      return filteredListings;
  };

  const activeListings = getActiveListings();

  const renderMarketplaceView = () => (
      <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 mt-4 gap-4">
            <div>
                {appMode === AppMode.COMBINED && (
                    <button 
                        onClick={() => navigateTo('HOME')}
                        className="mb-2 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back to Home
                    </button>
                )}
                <h1 className="text-3xl font-bold text-gray-900">
                    {appMode === AppMode.COMBINED 
                        ? (combinedTab === 'MARKET' ? 'Marketplace' : 'Live Breaks') 
                        : (appMode === AppMode.BREAKS ? 'Live Breaks' : 'Marketplace')
                    }
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    {appMode === AppMode.BREAKS || (appMode === AppMode.COMBINED && combinedTab === 'BREAKS') 
                        ? 'Join live scheduled breaks and community openings.' 
                        : 'Discover rare cards, graded slabs, and sealed products.'}
                </p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                    onClick={handleSellClick}
                    className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    New Listing
                </button>
            </div>
        </div>

        {appMode === AppMode.COMBINED && (
            <div className="flex space-x-6 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setCombinedTab('MARKET')}
                    className={`pb-3 text-sm font-medium transition-all relative ${combinedTab === 'MARKET' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Marketplace Cards
                    {combinedTab === 'MARKET' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full"></span>}
                </button>
                <button
                    onClick={() => setCombinedTab('BREAKS')}
                    className={`pb-3 text-sm font-medium transition-all relative ${combinedTab === 'BREAKS' ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Live Breaks
                    {combinedTab === 'BREAKS' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></span>}
                </button>
            </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input 
                    type="text"
                    placeholder={appMode === AppMode.BREAKS || (appMode === AppMode.COMBINED && combinedTab === 'BREAKS') ? "Search breaks..." : "Search Pokemon, sets, or details..."}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow"
                    value={filters.searchQuery}
                    onChange={(e) => setFilter('searchQuery', e.target.value)}
                />
            </div>
            
            {!(appMode === AppMode.BREAKS || (appMode === AppMode.COMBINED && combinedTab === 'BREAKS')) && (
                <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setFilter('category', ProductCategory.RAW_CARD)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${filters.category === ProductCategory.RAW_CARD ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >Raw</button>
                        <button 
                        onClick={() => setFilter('category', ProductCategory.GRADED_CARD)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${filters.category === ProductCategory.GRADED_CARD ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >Graded</button>
                        <button 
                        onClick={() => setFilter('category', ProductCategory.SEALED_PRODUCT)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${filters.category === ProductCategory.SEALED_PRODUCT ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >Sealed</button>
                </div>
            )}

            <button 
                onClick={() => setFilterDrawerOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${activeFilterCount > 0 ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
                Filters
                {activeFilterCount > 0 && (
                    <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {activeFilterCount}
                    </span>
                )}
            </button>
        </div>

        {loading ? (
            <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>
        ) : activeListings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search query.</p>
                <p className="mt-4 text-xs text-blue-600 cursor-pointer font-semibold hover:underline" onClick={() => { setFilter('searchQuery', ''); }}>Clear search</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeListings.map(listing => (
                    <div key={listing.id} onClick={() => handleViewListing(listing)} className="cursor-pointer">
                        <ListingCard 
                            listing={listing} 
                            onInteract={handleInteraction}
                            enableHoverPreview={false} 
                            actionLabel={currentUser?.role === 'SELLER' && listing.sellerId === currentUser.id ? 'Manage' : (listing.type === ListingType.AUCTION ? 'Bid' : 'Buy')}
                            currentUserId={currentUser?.id}
                        />
                    </div>
                ))}
            </div>
        )}
      </>
  );

  const renderContent = () => {
      switch (currentView) {
          case 'HOME':
              return (
                <Suspense fallback={<PageLoader />}>
                    <CombinedHome 
                        onNavigate={handleViewListing} 
                        onInteract={handleInteraction}
                        onSelectMode={(mode) => {
                            setCombinedTab(mode);
                            navigateTo('MARKETPLACE');
                        }}
                    />
                </Suspense>
              );
          case 'LOGIN':
              return <Suspense fallback={<PageLoader />}><div className="mt-8"><LoginForm onSuccess={handleAuthSuccess} onSwitchToRegister={() => navigateTo('REGISTER')} onForgotPassword={() => navigateTo('FORGOT_PASSWORD')} /></div></Suspense>;
          case 'REGISTER':
              return <Suspense fallback={<PageLoader />}><div className="mt-8"><RegisterForm onSuccess={handleAuthSuccess} onSwitchToLogin={() => navigateTo('LOGIN')} /></div></Suspense>;
          case 'FORGOT_PASSWORD':
              return <Suspense fallback={<PageLoader />}><div className="mt-8"><ForgotPasswordForm onSwitchToLogin={() => navigateTo('LOGIN')} /></div></Suspense>;
          case 'PROFILE':
              return currentUser ? <Suspense fallback={<PageLoader />}><div className="mt-8"><UserProfile user={currentUser} isOwnProfile={true} /></div></Suspense> : null;
          case 'DASHBOARD':
              return currentUser?.role === 'SELLER' ? (
                  <Suspense fallback={<PageLoader />}>
                      <SellerDashboard 
                          onNavigate={navigateTo} 
                          onInteract={handleInteraction}
                          onEdit={(listing) => {
                              setEditingListing(listing || null);
                              setAddListingModalOpen(true);
                          }} 
                      />
                  </Suspense>
              ) : <div className="text-center py-20 text-gray-500">Dashboard not available</div>;
          case 'DETAILS':
              if (!selectedListing) return <div className="text-center py-20">Loading listing...</div>;
              return (
                  <Suspense fallback={<PageLoader />}>
                    <ListingDetailView 
                        listing={selectedListing} 
                        currentUser={currentUser} 
                        onBack={handleBackFromDetails}
                        onInteract={handleInteraction}
                        onViewListing={handleViewListing}
                        onWatchLive={handleWatchLive}
                    />
                  </Suspense>
              );
          case 'LIVE':
              if (!selectedListing) return <div className="text-center py-20">Loading stream...</div>;
              return (
                  <Suspense fallback={<PageLoader />}>
                      <LiveSession 
                          listing={selectedListing}
                          currentUser={currentUser}
                          onBack={handleBackFromLive}
                      />
                  </Suspense>
              );
          case 'CHAT':
              if (!currentUser) return null;
              return (
                  <Suspense fallback={<PageLoader />}>
                    <div className="mt-4 h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex">
                        <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-gray-200`}>
                            <Inbox currentUser={currentUser} onSelect={(id) => selectConversation(id)} selectedId={activeConversation?.id} />
                        </div>
                        <div className={`${!activeConversation ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 flex-col bg-gray-50`}>
                            {activeConversation ? (
                                <ChatThread conversation={activeConversation} currentUser={currentUser} onBack={() => selectConversation('')} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <p className="text-lg font-medium text-gray-500">Select a conversation</p>
                                </div>
                            )}
                        </div>
                    </div>
                  </Suspense>
              );
          case 'COMMUNITY':
              return <Suspense fallback={<PageLoader />}><CommunityHub onNavigateGroup={handleNavigateGroup} /></Suspense>;
          case 'COMMUNITY_GROUP':
              const group = groups.find(g => g.id === selectedGroupId);
              if (!group) return <div className="text-center py-20">Group not found</div>;
              return <Suspense fallback={<PageLoader />}><GroupView group={group} onNavigateThread={handleNavigateThread} onBack={handleBackToCommunity} /></Suspense>;
          case 'COMMUNITY_THREAD':
              const thread = threads.find(t => t.id === selectedThreadId);
              if (!thread) return <div className="text-center py-20">Thread not found</div>;
              return <Suspense fallback={<PageLoader />}><ThreadView thread={thread} onBack={handleBackToGroup} /></Suspense>;
          
          case 'MARKETPLACE':
          default:
              return renderMarketplaceView();
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        {currentView !== 'LIVE' && <Navbar currentUser={currentUser} onNavigate={handleNavbarNavigate} onSell={handleSellClick} />}
        
        {notification && (
            <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 animate-bounce ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                {notification.message}
            </div>
        )}

        <main className={`flex-1 w-full ${currentView === 'LIVE' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'} h-full`}>
            {renderContent()}
        </main>

        <Suspense fallback={null}>
            <AddListingModal 
                isOpen={isAddListingModalOpen} 
                onClose={() => { setAddListingModalOpen(false); setEditingListing(null); }} 
                onAdd={handleAddOrEditListing}
                initialData={editingListing} 
            />
            
            {isFilterDrawerOpen && (
                <FilterDrawer isOpen={isFilterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} />
            )}
            
            {currentUser && bidModalState.listing && bidModalState.isOpen && (
                <BidModal 
                    isOpen={bidModalState.isOpen}
                    onClose={() => setBidModalState(prev => ({...prev, isOpen: false}))}
                    listing={bidModalState.listing}
                    currentUser={currentUser}
                    onPlaceBid={handlePlaceBidSubmit}
                    bidHistory={getBidsByListingId(bidModalState.listing.id)}
                />
            )}
        </Suspense>
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StoreProvider>
          <ChatProvider>
            <PokeVaultContent />
          </ChatProvider>
        </StoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
