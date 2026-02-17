
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Navbar } from './components/Navbar';
import { CombinedHome } from './components/CombinedHome';
import { CombinedSplitView } from './components/CombinedSplitView';
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
import { ShukFrame } from './components/ui/ShukFrame';
import { EmailVerificationModal } from './components/auth/EmailVerificationModal';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent = () => {
  const { 
      user: currentUser, 
      completeEmailVerification, 
      initiateEmailVerification 
  } = useAuth();
  
  const { 
    appMode, setAppMode, filteredListings, listings, addListing, updateListing, 
    placeBid, buyNow, joinBreak, groups, threads, getBidsByListingId
  } = useStore();

  const [currentView, setCurrentView] = useState('HOME');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<Listing | null>(null);
  
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [selectedListingForBid, setSelectedListingForBid] = useState<Listing | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  // Monitor verification status
  useEffect(() => {
      // Show verification modal if logged in, not verified, and not a demo social login
      if (currentUser && !currentUser.isEmailVerified && !currentUser.email.includes('demo.')) {
          setShowVerification(true);
      } else {
          setShowVerification(false);
      }
  }, [currentUser]);

  useEffect(() => {
      if (currentUser && currentUser.onboarding) {
          const roleKey: 'buyer' | 'seller' = currentUser.role === 'BUYER' ? 'buyer' : 'seller';
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
    if (view === 'HOME') {
        setAppMode(AppMode.COMBINED);
    }
    if (appMode !== AppMode.COMBINED) {
        window.scrollTo(0, 0);
    }
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
          handleNavigate('CHAT', listing.id);
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

  let content;
  
  const renderListingsGrid = () => (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 mt-4 gap-4">
            <div>
                <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                    {appMode === AppMode.MARKETPLACE ? 'Marketplace' : (appMode === AppMode.BREAKS ? 'Live Breaks' : 'The Shuk')}
                </h1>
                <div className="h-1 w-20 bg-shuk-primary mt-2 rounded-full"></div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                    onClick={() => setIsSellModalOpen(true)}
                    className="inline-flex items-center px-4 py-2.5 bg-shuk-primary text-shuk-dark text-sm font-bold rounded-lg hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Sell
                </button>
                <button
                    onClick={() => setFilterDrawerOpen(true)}
                    className="inline-flex items-center px-3 py-2.5 border border-shuk-border rounded-lg text-sm font-medium text-shuk-silver bg-shuk-surface hover:bg-shuk-surfaceHigh transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Filters
                </button>
            </div>
        </div>
        {filteredListings.length === 0 ? (
            <div className="text-center py-20 text-shuk-muted">No items found matching your criteria.</div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredListings.map(listing => (
                    <div key={listing.id} onClick={() => handleViewListing(listing)} className="cursor-pointer h-full">
                        <ListingCard 
                            listing={listing} 
                            onInteract={handleInteraction}
                            enableHoverPreview={false} 
                            actionLabel={currentUser?.id === listing.sellerId ? 'Manage' : (listing.type === ListingType.AUCTION ? 'Bid' : 'Buy')}
                            currentUserId={currentUser?.id}
                        />
                    </div>
                ))}
            </div>
        )}
      </div>
  );

  // Layout Logic Variables
  let mainClass = "flex-1 w-full relative z-10 overflow-y-auto custom-scrollbar";

  switch (currentView) {
    case 'HOME':
        if (appMode === AppMode.COMBINED) {
            content = (
                <CombinedHome 
                    onNavigate={handleViewListing} 
                    onSelectMode={(mode) => {
                        setAppMode(mode === 'MARKET' ? AppMode.MARKETPLACE : AppMode.BREAKS);
                        window.scrollTo(0,0);
                    }}
                    onInteract={handleInteraction} 
                    currentUserId={currentUser?.id}
                />
            );
        } else {
            content = renderListingsGrid();
        }
        break;
    
    case 'MARKETPLACE':
        content = renderListingsGrid();
        break;

    case 'DETAILS':
        const listing = listings.find(l => l.id === selectedId); 
        content = (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
                {listing ? (
                    <ListingDetailView 
                        listing={listing} 
                        currentUser={currentUser} 
                        onBack={() => handleNavigate('HOME')}
                        onInteract={handleInteraction}
                        onViewListing={handleViewListing}
                        onWatchLive={(l) => handleNavigate('LIVE', l.id)}
                    />
                ) : <div className="text-center p-8 text-shuk-silver">Listing not found</div>}
            </div>
        );
        break;

    case 'PROFILE':
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">{currentUser ? <UserProfile user={currentUser} isOwnProfile={true} /> : <LoginForm onSuccess={() => handleNavigate('PROFILE')} onSwitchToRegister={() => handleNavigate('REGISTER')} />}</div>;
        break;

    case 'DASHBOARD':
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"><SellerDashboard onNavigate={handleNavigate} onEdit={(l) => { setListingToEdit(l); setIsSellModalOpen(true); }} onInteract={handleInteraction} /></div>;
        break;

    case 'COMMUNITY':
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"><CommunityHub onNavigateGroup={(gid) => handleNavigate('GROUP', gid)} /></div>;
        break;

    case 'GROUP':
        const group = groups.find(g => g.id === selectedId);
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">{group ? <GroupView group={group} onNavigateThread={(tid) => handleNavigate('THREAD', tid)} onBack={() => handleNavigate('COMMUNITY')} /> : <div>Group not found</div>}</div>;
        break;

    case 'THREAD':
        const thread = threads.find(t => t.id === selectedId);
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">{thread ? <ThreadView thread={thread} onBack={() => handleNavigate('GROUP', thread.groupId)} /> : <div>Thread not found</div>}</div>;
        break;

    case 'CHAT':
        content = (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 h-[calc(100vh-64px)]">
                <div className="h-full border border-shuk-border rounded-xl overflow-hidden flex shadow-lg bg-shuk-surface">
                    <div className={`w-full md:w-1/3 border-r border-shuk-border ${selectedId ? 'hidden md:flex' : 'flex'}`}>
                        <Inbox currentUser={currentUser!} onSelect={(cid) => setSelectedId(cid)} selectedId={selectedId} />
                    </div>
                    <div className={`w-full md:w-2/3 ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
                        {selectedId ? (
                            <ChatWrapper conversationId={selectedId} currentUser={currentUser!} onBack={() => setSelectedId(undefined)} />
                        ) : (
                            <div className="hidden md:flex items-center justify-center w-full h-full text-shuk-muted bg-shuk-dark/50">Select a conversation</div>
                        )}
                    </div>
                </div>
            </div>
        );
        break;

    case 'LOGIN':
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"><div className="py-10"><LoginForm onSuccess={() => handleNavigate('HOME')} onSwitchToRegister={() => handleNavigate('REGISTER')} onForgotPassword={() => handleNavigate('FORGOT_PASSWORD')} /></div></div>;
        break;

    case 'REGISTER':
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"><div className="py-10"><RegisterForm onSuccess={() => handleNavigate('HOME')} onSwitchToLogin={() => handleNavigate('LOGIN')} /></div></div>;
        break;
        
    case 'FORGOT_PASSWORD':
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"><div className="py-10"><ForgotPasswordForm onSwitchToLogin={() => handleNavigate('LOGIN')} /></div></div>;
        break;

    case 'MODERATION':
        content = <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"><ModerationPanel /></div>;
        break;

    case 'LIVE':
        const liveListing = listings.find(l => l.id === selectedId);
        if (liveListing) {
            content = (
                <div className="h-full w-full bg-black overflow-hidden relative z-50">
                    <LiveSession listing={liveListing} currentUser={currentUser} onBack={() => handleNavigate('DETAILS', liveListing.id)} />
                </div>
            );
            return (
                <div className="fixed inset-0 z-50 bg-black">
                    {content}
                </div>
            );
        }
        content = <div>Live session not found</div>;
        break;

    default:
        content = renderListingsGrid();
  }

  return (
    <ShukFrame variant="app-shell" className="h-screen w-screen fixed inset-0 flex flex-col">
      <Navbar currentUser={currentUser} onNavigate={handleNavigate} onSell={() => setIsSellModalOpen(true)} />
      
      <main className={mainClass}>
        <ErrorBoundary>
            {content}
        </ErrorBoundary>
      </main>

      <AddListingModal 
        isOpen={isSellModalOpen} 
        onClose={() => { setIsSellModalOpen(false); setListingToEdit(null); }} 
        onAdd={handleSaveListing}
        initialData={listingToEdit}
      />

      <FilterDrawer isOpen={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} />
      
      {isBidModalOpen && selectedListingForBid && currentUser && (
          <BidModal 
            isOpen={isBidModalOpen}
            onClose={() => setIsBidModalOpen(false)}
            listing={selectedListingForBid}
            currentUser={currentUser}
            onPlaceBid={(amt) => placeBid(selectedListingForBid.id, amt)}
            bidHistory={selectedListingForBid ? getBidsByListingId(selectedListingForBid.id) : []}
          />
      )}

      {showVerification && currentUser && (
          <EmailVerificationModal 
              isOpen={showVerification}
              onClose={() => setShowVerification(false)}
              email={currentUser.email}
              onVerify={completeEmailVerification}
              onResend={initiateEmailVerification}
          />
      )}

      {showOnboarding && currentUser && (
          currentUser.role === 'BUYER' ? (
              <BuyerOnboarding onComplete={() => setShowOnboarding(false)} onSkip={() => setShowOnboarding(false)} />
          ) : (
              <SellerOnboarding onComplete={() => setShowOnboarding(false)} onSkip={() => setShowOnboarding(false)} />
          )
      )}
    </ShukFrame>
  );
};

const ChatWrapper: React.FC<{ conversationId: string, currentUser: any, onBack: () => void }> = ({ conversationId, currentUser, onBack }) => {
    const { selectConversation, activeConversation, loading } = useChat();
    useEffect(() => {
        selectConversation(conversationId);
    }, [conversationId]);

    if (loading || !activeConversation || activeConversation.id !== conversationId) return <div className="p-10 text-center text-shuk-muted">Loading chat...</div>;
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
