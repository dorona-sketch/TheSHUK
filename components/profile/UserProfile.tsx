
import React, { useState, useEffect } from 'react';
import { User, AppMode } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ProfileHeader } from './ProfileHeader';
import { TrustCard } from './TrustCard';
import { StatsRow } from './StatsRow';
import { ProfileTabs } from './ProfileTabs';
import { EditProfileModal } from './EditProfileModal';
import { formatLocalTime } from '../../utils/dateUtils';

interface UserProfileProps {
    user: User;
    isOwnProfile: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user: initialUser, isOwnProfile }) => {
    const { user: currentUser, updateProfile, logout, verifySeller } = useAuth();
    const { transactions, listings, breakEntries, depositFunds, verifySellerListings } = useStore();
    
    // Local state for immediate updates
    const [user, setUser] = useState<User>(initialUser);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        setUser(initialUser);
    }, [initialUser]);

    // --- Derived Stats ---
    const myTransactions = transactions
        .filter(t => t.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const stats = {
        listings: listings.filter(l => l.sellerId === user.id).length,
        bids: myTransactions.filter(t => t.type === 'PURCHASE').length, // Approx
        breaks: breakEntries.filter(b => b.userId === user.id).length
    };

    // --- Actions ---
    const handleSaveProfile = async (updates: Partial<User>) => {
        await updateProfile(updates);
        setUser(prev => ({ ...prev, ...updates }));
    };

    const handleBecomeSeller = async () => {
        if (confirm("Switch to Seller Account? You will gain access to listing tools.")) {
            await updateProfile({ role: 'SELLER' });
            setUser(prev => ({ ...prev, role: 'SELLER' }));
        }
    };

    const handleSwitchRole = async () => {
        if (confirm("Switch back to Buyer role? Listings will remain active.")) {
            await updateProfile({ role: 'BUYER' });
            setUser(prev => ({ ...prev, role: 'BUYER' }));
        }
    };

    const handleLogout = async () => {
        if(confirm("Log out of Break-Hit?")) await logout();
    };

    const handleTopUp = async () => {
        const amount = prompt("Amount to deposit:", "100");
        if (amount && !isNaN(parseFloat(amount))) {
            const res = await depositFunds(parseFloat(amount));
            alert(res.message);
        }
    };

    const handleVerifyUser = async () => {
        if (confirm(`Verify ${user.name} as a Trusted Seller?`)) {
            const res = await verifySeller(user.id);
            if (res.success) {
                setUser(prev => ({ ...prev, isVerifiedSeller: true }));
                verifySellerListings(user.id);
                alert(res.message);
            } else {
                alert(res.message);
            }
        }
    };

    // Logic: Admin can verify if viewing another user who is a seller and not yet verified
    const canVerify = currentUser?.isAdmin && !isOwnProfile && user.role === 'SELLER' && !user.isVerifiedSeller;

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <ProfileHeader 
                user={user} 
                isOwnProfile={isOwnProfile} 
                onEdit={() => setIsEditModalOpen(true)} 
                onBecomeSeller={handleBecomeSeller}
                onSwitchRole={handleSwitchRole}
                onVerify={canVerify ? handleVerifyUser : undefined}
            />

            <div className="px-4 md:px-8 space-y-6">
                
                {/* Stats & Trust Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TrustCard 
                        user={user} 
                        trustScore={user.id.length % 2 === 0 ? 98 : 85} // Mock score
                        salesCount={user.id.length * 4} // Mock count
                        rating={4.9} 
                    />
                    <div>
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-4">Activity Stats</h3>
                            <StatsRow stats={stats} />
                            
                            {isOwnProfile && (
                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                                    <div className="text-xs text-gray-500">
                                        Wallet: <span className="font-bold text-green-600 text-sm">${user.walletBalance.toLocaleString()}</span>
                                    </div>
                                    <button onClick={handleTopUp} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                        + Deposit
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <ProfileTabs 
                    transactions={myTransactions} 
                    listings={listings} 
                    breaks={breakEntries} 
                    userId={user.id} 
                />

                {/* Account Actions Footer */}
                {isOwnProfile && (
                    <div className="pt-8 border-t border-gray-200">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">Account Settings</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                Notification Preferences
                            </button>
                            <button className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                Privacy & Security
                            </button>
                            <button className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                Help & Support
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="text-left px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 font-bold hover:bg-red-100 transition-colors"
                            >
                                Log Out
                            </button>
                        </div>
                        <div className="text-center mt-8 text-xs text-gray-400">
                            Member since {formatLocalTime(user.joinedAt)} • Version 1.0.0 (MVP)
                        </div>
                    </div>
                )}
            </div>

            <EditProfileModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                user={user} 
                onSave={handleSaveProfile} 
            />
        </div>
    );
};
