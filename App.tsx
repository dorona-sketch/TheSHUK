
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Navbar } from './components/Navbar';
import { CombinedHome } from './components/CombinedHome';
import { ListingDetailView } from './components/ListingDetailView';
import { UserProfile } from './components/profile/UserProfile';
import { SellerDashboard } from './components/dashboard/SellerDashboard';
import { AddListingModal } from './components/AddListingModal';
import { FilterDrawer } from './components/FilterDrawer';
import { CommunityHub } from './components/community/CommunityHub';
import { GroupView } from './components/community/GroupView';
import { ThreadView } from './components/community/ThreadView';
import { Inbox } from './components/chat/Inbox';
import { ChatThread } from './components/chat/ChatThread';
import { LiveSession } from './components/live/LiveSession';
import { ModerationPanel } from './components/admin/ModerationPanel';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { ListingCard } from './components/ListingCard';
import { BuyerOnboarding } from './components/onboarding/BuyerOnboarding';
import { SellerOnboarding } from './components/onboarding/SellerOnboarding';
import { Listing, ListingType, AppMode, BreakStatus } from './types';
import { BidModal } from './components/bids/BidModal';

const AppContent = () => {
  const { user: currentUser } = useAuth();
  const { 
    appMode, setAppMode, filteredListings, addListing, updateListing, 
    placeBid, buyNow, joinBreak, groups, threads, getBidsByListingId
  } = useStore();

  const [currentView, setCurrentView] = useState('HOME');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<Listing | null>(null);
  
  // Bid Modal
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [selectedListingForBid, setSelectedListingForBid] = useState<Listing | null>(null);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
      // Trigger onboarding if user logs in and hasn't completed it
      if (currentUser && currentUser.onboarding) {
          const roleKey = currentUser.role === 'BUYER' ? 'buyer' : 'seller';
          // @ts-ignore
          const state = currentUser.onboarding[roleKey];
          if (state && !state.completedAt && !state.skipped) {
              setShowOnboarding(true);
          } else {
              setShowOnboarding(false);
          }
      } else {
          setShowOnboarding(false);
      }
  }, [currentUser]);

  const handleNavigate = (view: any, id?: string) => {
    setCurrentView(view);
    setSelectedId(id);
    window.scrollTo(0, 0);
  };

  const handleInteraction = (listing: Listing, action: 'BUY' | 'BID' | 'CHAT' | 'MANAGE') => {
      if (!currentUser) {
          handleNavigate('LOGIN');
          return;
      }

      if (action === 'BID') {
          setSelectedListingForBid(listing);
          setIsBidModalOpen(true);
      } else if (action === 'BUY') {
          if (listing.type === ListingType.TIMED_BREAK) {
              joinBreak(listing.id).then(res => alert(res.message));
          } else {
              if (confirm(`Buy ${listing.title} for $${listing.price}?`)) {
                  const res = buyNow(listing.id);
                  alert(res.message);
              }
          }
      } else if (action === 'CHAT') {
          // Typically would open chat with seller
          handleNavigate('CHAT', listing.id); // Passing listing ID to maybe context switch
      } else if (action === 'MANAGE') {
          if (listing.type === ListingType.TIMED_BREAK && listing.breakStatus === BreakStatus.LIVE) {
              handleNavigate('LIVE', listing.id);
          } else {
              setListingToEdit(listing);
              setIsSellModalOpen(true);
          }
      }
  };

  const handleViewListing = (listing: Listing) => {
      handleNavigate('DETAILS', listing.id);
  };

  const handleSaveListing = (data: any) => {
      if (listingToEdit) {
          updateListing(listingToEdit.id, data);
      } else {
          addListing(data);
      }
      setIsSellModalOpen(false);
      setListingToEdit(null);
  };

  // --- Render Content ---
  let content;
  
  // Helper for filtered view (marketplace/breaks)
  const renderListingsGrid = () => (
      <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 mt-4 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    {appMode === AppMode.MARKETPLACE ? 'Marketplace' : (appMode === AppMode.BREAKS ? 'Live Breaks' : 'Explore')}
                </h1>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                    onClick={() => setIsSellModalOpen(true)}
                    className="inline-flex items-center px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-colors shadow-sm"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Sell
                </button>
                <button
                    onClick={() => setFilterDrawerOpen(true)}
                    className="inline-flex items-center px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Filters
                </button>
            </div>
        </div>
        {filteredListings.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No items found matching your criteria.</div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredListings.map(listing => (
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

  switch (currentView) {
    case 'HOME':
        // If appMode is specifically set to one mode via Navbar, show that mode's grid
        if (appMode !== AppMode.COMBINED) {
            content = renderListingsGrid();
        } else {
            content = (
                <CombinedHome 
                    onNavigate={handleViewListing} 
                    onSelectMode={(mode) => {
                        setAppMode(mode === 'MARKET' ? AppMode.MARKETPLACE : AppMode.BREAKS);
                        setCurrentView('MARKETPLACE'); // Or just trigger re-render with new mode
                    }}
                    onInteract={handleInteraction}
                />
            );
        }
        break;
    
    case 'MARKETPLACE':
        content = renderListingsGrid();
        break;

    case 'DETAILS':
        const listing = filteredListings.find(l => l.id === selectedId) || filteredListings[0]; // Fallback if id not found (mock)
        content = (
            <ListingDetailView 
                listing={listing} 
                currentUser={currentUser} 
                onBack={() => handleNavigate('HOME')}
                onInteract={handleInteraction}
                onViewListing={handleViewListing}
                onWatchLive={(l) => handleNavigate('LIVE', l.id)}
            />
        );
        break;

    case 'PROFILE':
        content = currentUser ? <UserProfile user={currentUser} isOwnProfile={true} /> : <LoginForm onSuccess={() => handleNavigate('PROFILE')} onSwitchToRegister={() => handleNavigate('REGISTER')} />;
        break;

    case 'DASHBOARD':
        content = <SellerDashboard onNavigate={handleNavigate} onEdit={(l) => { setListingToEdit(l); setIsSellModalOpen(true); }} onInteract={handleInteraction} />;
        break;

    case 'COMMUNITY':
        content = <CommunityHub onNavigateGroup={(gid) => handleNavigate('GROUP', gid)} />;
        break;

    case 'GROUP':
        const group = groups.find(g => g.id === selectedId);
        content = group ? <GroupView group={group} onNavigateThread={(tid) => handleNavigate('THREAD', tid)} onBack={() => handleNavigate('COMMUNITY')} /> : <div>Group not found</div>;
        break;

    case 'THREAD':
        const thread = threads.find(t => t.id === selectedId);
        content = thread ? <ThreadView thread={thread} onBack={() => handleNavigate('GROUP', thread.groupId)} /> : <div>Thread not found</div>;
        break;

    case 'CHAT':
        // TODO: Handle splitting inbox and thread or combined view
        content = <div className="h-[80vh] border border-gray-200 rounded-xl overflow-hidden flex shadow-sm bg-white">
            <div className={`w-full md:w-1/3 border-r border-gray-200 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
                <Inbox currentUser={currentUser!} onSelect={(cid) => setSelectedId(cid)} selectedId={selectedId} />
            </div>
            <div className={`w-full md:w-2/3 ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
                {selectedId ? (
                    // Needs conversation object. We can fetch from store/context.
                    // For now, assume ChatContext handles data fetching based on ID inside ChatThread or similar wrapper
                    // But ChatThread takes `conversation` prop.
                    // We'll rely on the ChatContext activeConversation which is set when we select.
                    // Wait, `Inbox` onSelect calls `setSelectedId` but should also call `selectConversation`.
                    // Let's assume we render a wrapper that handles this.
                    <ChatWrapper conversationId={selectedId} currentUser={currentUser!} onBack={() => setSelectedId(undefined)} />
                ) : (
                    <div className="hidden md:flex items-center justify-center w-full h-full text-gray-400 bg-gray-50">Select a conversation</div>
                )}
            </div>
        </div>;
        break;

    case 'LOGIN':
        content = <div className="py-10"><LoginForm onSuccess={() => handleNavigate('HOME')} onSwitchToRegister={() => handleNavigate('REGISTER')} onForgotPassword={() => handleNavigate('FORGOT_PASSWORD')} /></div>;
        break;

    case 'REGISTER':
        content = <div className="py-10"><RegisterForm onSuccess={() => handleNavigate('HOME')} onSwitchToLogin={() => handleNavigate('LOGIN')} /></div>;
        break;
        
    case 'FORGOT_PASSWORD':
        content = <div className="py-10"><ForgotPasswordForm onSwitchToLogin={() => handleNavigate('LOGIN')} /></div>;
        break;

    case 'MODERATION':
        content = <ModerationPanel />;
        break;

    case 'LIVE':
        const liveListing = filteredListings.find(l => l.id === selectedId);
        if (liveListing) {
            // Live Session usually takes full screen, maybe hide navbar? 
            // For now, render inside layout.
            return (
                <div className="min-h-screen bg-black">
                    <LiveSession listing={liveListing} currentUser={currentUser} onBack={() => handleNavigate('DETAILS', liveListing.id)} />
                </div>
            );
        }
        content = <div>Live session not found</div>;
        break;

    default:
        content = renderListingsGrid();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <Navbar currentUser={currentUser} onNavigate={handleNavigate} onSell={() => setIsSellModalOpen(true)} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {content}
      </div>

      <AddListingModal 
        isOpen={isSellModalOpen} 
        onClose={() => { setIsSellModalOpen(false); setListingToEdit(null); }} 
        onAdd={handleSaveListing}
        initialData={listingToEdit}
      />

      <FilterDrawer isOpen={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} />
      
      <BidModal 
        isOpen={isBidModalOpen}
        onClose={() => setIsBidModalOpen(false)}
        listing={selectedListingForBid}
        currentUser={currentUser!}
        onPlaceBid={(amt) => placeBid(selectedListingForBid!.id, amt)}
        bidHistory={selectedListingForBid ? getBidsByListingId(selectedListingForBid.id) : []}
      />

      {showOnboarding && currentUser && (
          currentUser.role === 'BUYER' ? (
              <BuyerOnboarding onComplete={() => setShowOnboarding(false)} onSkip={() => setShowOnboarding(false)} />
          ) : (
              <SellerOnboarding onComplete={() => setShowOnboarding(false)} onSkip={() => setShowOnboarding(false)} />
          )
      )}
    </div>
  );
};

// Helper for Chat loading
const ChatWrapper: React.FC<{ conversationId: string, currentUser: any, onBack: () => void }> = ({ conversationId, currentUser, onBack }) => {
    const { selectConversation, activeConversation, loading } = useChat();
    useEffect(() => {
        selectConversation(conversationId);
    }, [conversationId]);

    if (loading || !activeConversation || activeConversation.id !== conversationId) return <div className="p-10 text-center">Loading chat...</div>;
    return <ChatThread conversation={activeConversation} currentUser={currentUser} onBack={onBack} />;
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
