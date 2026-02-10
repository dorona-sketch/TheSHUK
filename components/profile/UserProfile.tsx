
import React, { useState, useRef } from 'react';
import { User, TransactionType, AppMode } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { processImageUpload } from '../../utils/imageProcessing';
import { getLocationInfo } from '../../services/geminiService';
import { formatLocalTime, formatDate } from '../../utils/dateUtils';
import { EmailVerificationModal } from '../auth/EmailVerificationModal';

interface UserProfileProps {
    user: User;
    isOwnProfile: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, isOwnProfile }) => {
    const { updateProfile, logout, initiateEmailVerification, completeEmailVerification } = useAuth();
    const { transactions, depositFunds } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    
    // Edit State
    const [name, setName] = useState(user.displayName || user.name);
    const [bio, setBio] = useState(user.bio || '');
    const [location, setLocation] = useState(user.location || '');
    const [isLocationVerified, setIsLocationVerified] = useState(user.isLocationVerified || false);
    const [role, setRole] = useState(user.role);
    const [preferredView, setPreferredView] = useState<AppMode>(user.preferredAppMode || AppMode.COMBINED);
    const [loading, setLoading] = useState(false);
    
    // Verification State
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    
    // Interest State
    const [interestPokemon, setInterestPokemon] = useState(user.interests?.pokemon?.join(', ') || '');
    const [interestSets, setInterestSets] = useState(user.interests?.sets?.join(', ') || '');

    // Social Links State
    const [socials, setSocials] = useState({
        twitter: user.socialLinks?.twitter || '',
        instagram: user.socialLinks?.instagram || '',
        discord: user.socialLinks?.discord || '',
        youtube: user.socialLinks?.youtube || ''
    });

    // Verify Toggle (MVP)
    const [isVerified, setIsVerified] = useState(user.isVerifiedSeller || false);
    
    // Location Verification State
    const [verifyingLoc, setVerifyingLoc] = useState(false);
    const [locationData, setLocationData] = useState<{text: string, mapLinks: any[]} | null>(null);

    // Image Upload State
    const [uploadingType, setUploadingType] = useState<'avatar' | 'cover' | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Mock Seller Stats (Deterministic based on user ID for demo continuity)
    const sellerStats = {
        rating: user.id.length % 2 === 0 ? 4.9 : 4.5,
        reviewCount: user.id.length % 2 === 0 ? 124 : 42,
        trustScore: user.id.length % 2 === 0 ? 98 : 85,
        transactions: 0 // Mock empty to show placeholder
    };

    const isSuspended = user.suspensionUntil && new Date(user.suspensionUntil) > new Date();

    const myTransactions = transactions
        .filter(t => t.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleSave = async () => {
        setLoading(true);
        await updateProfile({ 
            name: name, // Keep sync for backward compat
            displayName: name, // New standard
            bio, 
            location,
            isLocationVerified,
            role, 
            preferredAppMode: preferredView,
            socialLinks: socials,
            isVerifiedSeller: isVerified,
            interests: {
                pokemon: interestPokemon.split(',').map(s => s.trim()).filter(Boolean),
                sets: interestSets.split(',').map(s => s.trim()).filter(Boolean)
            }
        });
        setLoading(false);
        setIsEditing(false);
    };

    const handleLogout = async () => {
        if(confirm('Are you sure you want to log out?')) {
            await logout();
        }
    };

    const verifyLocation = async () => {
        if (!location) return;
        setVerifyingLoc(true);
        setLocationData(null);
        const data = await getLocationInfo(location);
        setLocationData(data);
        setVerifyingLoc(false);

        // Mark as verified if we got valid map links from grounding
        if (data && data.mapLinks && data.mapLinks.length > 0) {
            setIsLocationVerified(true);
        } else {
            setIsLocationVerified(false);
        }
    };

    const handleEmailVerificationStart = async () => {
        setVerifyingEmail(true);
        try {
            const res = await initiateEmailVerification();
            if (res.success) {
                setShowVerifyModal(true);
            } else {
                alert(res.message);
            }
        } catch (e) {
            alert("Error sending verification code.");
        } finally {
            setVerifyingEmail(false);
        }
    };

    const handleEmailVerificationComplete = async (code: string) => {
        const res = await completeEmailVerification(code);
        if (res.success) {
            setShowVerifyModal(false);
            alert(res.message);
        }
        return res;
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocation(e.target.value);
        setIsLocationVerified(false); // Reset verification on change
        setLocationData(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation: Size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large. Please select an image under 10MB.");
            return;
        }

        setUploadingType(type);
        try {
            // Process Image: Resize, Crop, Compress
            // Avatar: 300x300 (Square), Cover: 1200x400 (3:1)
            const processedBase64 = await processImageUpload(file, {
                targetWidth: type === 'avatar' ? 300 : 1200,
                aspectRatio: type === 'avatar' ? 1 : 3
            });

            // Optimistic Update (Persist to DB immediately in this MVP)
            if (type === 'avatar') {
                await updateProfile({ avatar: processedBase64, avatarUrl: processedBase64 });
            } else {
                await updateProfile({ coverImage: processedBase64, coverImageUrl: processedBase64 });
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to process image. Please try another file.");
        } finally {
            setUploadingType(null);
            // Reset input so same file can be selected again if needed
            if (e.target) e.target.value = '';
        }
    };

    const handleTopUp = async () => {
        const amountStr = prompt("Enter amount to deposit ($):", "100");
        if (!amountStr) return;
        
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");

        const result = await depositFunds(amount);
        if (!result.success) {
            alert(result.message);
        }
    };

    const displayAvatar = user.avatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${user.name}`;
    const displayCover = user.coverImageUrl || user.coverImage;
    const displayName = user.displayName || user.name;

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
            {/* Verification Modal */}
            <EmailVerificationModal 
                isOpen={showVerifyModal} 
                onClose={() => setShowVerifyModal(false)}
                email={user.email}
                onVerify={handleEmailVerificationComplete}
                onResend={initiateEmailVerification}
            />

            {/* Hidden Inputs for File Upload */}
            <input 
                type="file" 
                ref={avatarInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'avatar')}
            />
            <input 
                type="file" 
                ref={coverInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'cover')}
            />

            {/* Header / Banner */}
            <div className="h-48 relative group bg-gray-200">
                {displayCover ? (
                    <img src={displayCover} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                )}
                
                <div className="absolute inset-0 bg-black/10"></div>

                {/* Edit Cover Button */}
                {isEditing && (
                    <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
                        {uploadingType !== 'cover' && (
                            <span className="text-[10px] text-white/90 bg-black/40 px-2 py-1 rounded backdrop-blur-sm shadow-sm">
                                Auto-crops to 3:1 aspect ratio
                            </span>
                        )}
                        <button 
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingType === 'cover'}
                            className="bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-sm transition-all flex items-center gap-2"
                        >
                            {uploadingType === 'cover' ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Change Cover
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
            
            <div className="px-6 pb-6">
                <div className="relative flex justify-between items-end -mt-16 mb-6">
                    <div className="flex items-end">
                        {/* Avatar Slot */}
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden relative">
                                <img 
                                    src={displayAvatar} 
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                />
                                {uploadingType === 'avatar' && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            
                            {isEditing && (
                                <button 
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 transition-colors cursor-pointer z-20 ring-4 ring-transparent"
                                    title="Upload Profile Picture (Square)"
                                >
                                    <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div className="ml-4 mb-1">
                            {isEditing ? (
                                <input 
                                    value={name} 
                                    onChange={e => setName(e.target.value)}
                                    className="text-2xl font-bold text-gray-900 border-b border-gray-300 focus:border-primary-500 outline-none bg-transparent w-full"
                                    placeholder="Display Name"
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                                    {user.role === 'SELLER' && (user.isVerifiedSeller || sellerStats.trustScore > 90) && (
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Verified Seller
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex flex-col mt-1">
                                <div className="flex items-center text-sm text-gray-500">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                value={location} 
                                                onChange={handleLocationChange}
                                                placeholder="Add location (e.g. New York)"
                                                className="border-b border-gray-300 focus:border-primary-500 outline-none bg-transparent"
                                            />
                                            {location && (
                                                <button 
                                                    onClick={verifyLocation} 
                                                    disabled={verifyingLoc || isLocationVerified} 
                                                    className={`text-xs ${isLocationVerified ? 'text-green-600 font-bold' : 'text-blue-600 underline'}`}
                                                >
                                                    {verifyingLoc ? 'Verifying...' : (isLocationVerified ? 'Verified' : 'Verify')}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            {user.location || 'Location not set'}
                                            {user.isLocationVerified && (
                                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <title>Verified Location</title>
                                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Location Verification Result */}
                                {locationData && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100 text-xs text-blue-800 animate-fade-in-up">
                                        <p className="font-medium mb-1">{locationData.text}</p>
                                        {locationData.mapLinks.length > 0 && (
                                             <div className="flex flex-wrap gap-1">
                                                {locationData.mapLinks.map((link, i) => (
                                                    <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-900">
                                                        {link.title}
                                                    </a>
                                                ))}
                                             </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {isOwnProfile && !isEditing && (
                        <div className="flex gap-2">
                             <button 
                                onClick={handleLogout}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Log Out
                            </button>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 shadow-sm transition-colors"
                            >
                                Edit Profile
                            </button>
                        </div>
                    )}
                    {isEditing && (
                         <div className="flex gap-2">
                            <button 
                                onClick={() => { 
                                    setIsEditing(false); 
                                    setName(user.displayName || user.name); 
                                    setBio(user.bio || ''); 
                                    setLocation(user.location || ''); 
                                    setIsLocationVerified(user.isLocationVerified || false);
                                    setPreferredView(user.preferredAppMode || AppMode.COMBINED);
                                    setInterestPokemon(user.interests?.pokemon?.join(', ') || '');
                                    setInterestSets(user.interests?.sets?.join(', ') || '');
                                    setSocials({
                                        twitter: user.socialLinks?.twitter || '',
                                        instagram: user.socialLinks?.instagram || '',
                                        discord: user.socialLinks?.discord || '',
                                        youtube: user.socialLinks?.youtube || ''
                                    });
                                    setIsVerified(user.isVerifiedSeller || false); 
                                    setLocationData(null); 
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 shadow-sm transition-colors"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Account Status / Banners */}
                <div className="space-y-4 mb-8">
                    {/* Suspension Banner (Prominent) */}
                    {isSuspended && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-pulse-slow">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-100 rounded-full text-red-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-red-800 font-bold text-lg">Account Suspended</h3>
                                    <p className="text-red-700 mt-1 font-medium">
                                        {user.suspensionReason || 'Violation of Terms of Service'}
                                    </p>
                                    <p className="text-red-600 text-sm mt-2">
                                        Suspension active until: <span className="font-bold">{formatLocalTime(user.suspensionUntil)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email Verification Banner */}
                    {isOwnProfile && !user.isEmailVerified && !isSuspended && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-bold text-yellow-800">Email not verified</p>
                                        <p className="text-xs text-yellow-700">Please verify your email to unlock all marketplace features.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleEmailVerificationStart}
                                    disabled={verifyingEmail}
                                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-md border border-yellow-300 transition-colors"
                                >
                                    {verifyingEmail ? 'Sending...' : 'Verify Email'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Stats & Role */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                             <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</h3>
                             
                             {/* New Status Row */}
                             <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                                <span className="text-gray-600 text-sm">Status</span>
                                <div className="flex flex-col items-end gap-1">
                                    {isSuspended ? (
                                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">SUSPENDED</span>
                                    ) : (
                                        <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
                                    )}
                                    {user.isVerifiedSeller && !isSuspended && (
                                        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            Verified <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        </span>
                                    )}
                                </div>
                             </div>

                             <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600 text-sm">Role</span>
                                {isEditing ? (
                                    <select 
                                        value={role} 
                                        onChange={e => setRole(e.target.value as any)}
                                        className="text-xs border rounded p-1"
                                    >
                                        <option value="BUYER">Buyer</option>
                                        <option value="SELLER">Seller</option>
                                    </select>
                                ) : (
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${user.role === 'SELLER' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {user.role}
                                    </span>
                                )}
                             </div>

                             {/* Preferred App Mode Setting */}
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600 text-sm">Default View</span>
                                {isEditing ? (
                                    <select 
                                        value={preferredView} 
                                        onChange={e => setPreferredView(e.target.value as AppMode)}
                                        className="text-xs border rounded p-1"
                                    >
                                        <option value={AppMode.MARKETPLACE}>Marketplace</option>
                                        <option value={AppMode.BREAKS}>Breaks</option>
                                        <option value={AppMode.COMBINED}>Combined</option>
                                    </select>
                                ) : (
                                    <span className="text-gray-900 text-sm font-medium">
                                        {preferredView === AppMode.MARKETPLACE ? 'Marketplace' : (preferredView === AppMode.BREAKS ? 'Breaks' : 'Combined')}
                                    </span>
                                )}
                             </div>

                             <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600 text-sm">Joined</span>
                                <span className="text-gray-900 text-sm font-medium">
                                    {formatDate(user.joinedAt)}
                                </span>
                             </div>
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-600 text-sm">Wallet</span>
                                <span className="text-green-600 text-sm font-bold">
                                    ${user.walletBalance.toLocaleString()}
                                </span>
                             </div>
                             {isOwnProfile && (
                                 <button 
                                    onClick={handleTopUp}
                                    className="w-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs font-bold py-2 rounded-md transition-colors flex items-center justify-center gap-1"
                                 >
                                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                     Deposit Funds
                                 </button>
                             )}
                        </div>

                        {/* Interests Section */}
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <h3 className="text-sm font-semibold text-yellow-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="text-lg">🎯</span> Interests
                            </h3>
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Favorite Pokemon</label>
                                        <input 
                                            value={interestPokemon} 
                                            onChange={e => setInterestPokemon(e.target.value)}
                                            placeholder="e.g. Charizard, Gengar"
                                            className="w-full border rounded text-xs p-1.5 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Favorite Sets</label>
                                        <input 
                                            value={interestSets} 
                                            onChange={e => setInterestSets(e.target.value)}
                                            placeholder="e.g. 151, Evolving Skies"
                                            className="w-full border rounded text-xs p-1.5 mt-1"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {user.interests?.pokemon && user.interests.pokemon.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {user.interests.pokemon.map(p => (
                                                <span key={p} className="bg-white text-yellow-900 border border-yellow-200 px-2 py-0.5 rounded-full text-xs font-medium">{p}</span>
                                            ))}
                                        </div>
                                    )}
                                    {user.interests?.sets && user.interests.sets.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {user.interests.sets.map(s => (
                                                <span key={s} className="bg-white text-blue-900 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">{s}</span>
                                            ))}
                                        </div>
                                    )}
                                    {(!user.interests?.pokemon?.length && !user.interests?.sets?.length) && (
                                        <div className="text-xs text-yellow-700/50 italic">No interests set. Edit profile to get better recommendations.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Social Links Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Social Presence</h3>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-blue-400 font-bold w-16">Twitter</span>
                                        <input 
                                            value={socials.twitter} 
                                            onChange={e => setSocials({...socials, twitter: e.target.value})}
                                            className="text-xs border rounded p-1 flex-1"
                                            placeholder="@handle"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-pink-500 font-bold w-16">Instagram</span>
                                        <input 
                                            value={socials.instagram} 
                                            onChange={e => setSocials({...socials, instagram: e.target.value})}
                                            className="text-xs border rounded p-1 flex-1"
                                            placeholder="@handle"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-indigo-500 font-bold w-16">Discord</span>
                                        <input 
                                            value={socials.discord} 
                                            onChange={e => setSocials({...socials, discord: e.target.value})}
                                            className="text-xs border rounded p-1 flex-1"
                                            placeholder="user#1234"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-red-500 font-bold w-16">YouTube</span>
                                        <input 
                                            value={socials.youtube} 
                                            onChange={e => setSocials({...socials, youtube: e.target.value})}
                                            className="text-xs border rounded p-1 flex-1"
                                            placeholder="@channel"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {user.socialLinks?.twitter && (
                                        <a href={`https://twitter.com/${user.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-500">
                                            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                                            @{user.socialLinks.twitter}
                                        </a>
                                    )}
                                    {user.socialLinks?.instagram && (
                                        <a href={`https://instagram.com/${user.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-pink-500">
                                            <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                        </a>
                                    )}
                                    {user.socialLinks?.discord && (
                                        <div className="text-gray-400 hover:text-indigo-500 transition-colors cursor-help" title={user.socialLinks.discord}>
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/></svg>
                                        </div>
                                    )}
                                    {user.socialLinks?.youtube && (
                                        <a href={`https://youtube.com/@${user.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-600 transition-colors">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                        </a>
                                    )}
                                </div>
                            )}

                            {isEditing && (
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={isVerified} 
                                            onChange={e => setIsVerified(e.target.checked)}
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Verified Seller Status (Mock)</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Transaction History (Private View) */}
                        {isOwnProfile && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm animate-fade-in-up">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                    Transaction History
                                </h3>
                                <div className="overflow-x-auto">
                                    {myTransactions.length > 0 ? (
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-100">
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {myTransactions.map(tx => (
                                                    <tr key={tx.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                            {formatLocalTime(tx.createdAt)}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-900">
                                                            {tx.description}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase
                                                                ${tx.type === TransactionType.PURCHASE ? 'bg-red-100 text-red-800' : 
                                                                tx.type === TransactionType.DEPOSIT ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {tx.type}
                                                            </span>
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                            {tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 text-sm">No transactions found.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
