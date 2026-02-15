
import React from 'react';
import { User } from '../../types';
import { formatSmartDate } from '../../utils/dateUtils';

interface ProfileHeaderProps {
    user: User;
    isOwnProfile: boolean;
    onEdit: () => void;
    onBecomeSeller: () => void;
    onSwitchRole: () => void;
    onVerify?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
    user, 
    isOwnProfile, 
    onEdit,
    onBecomeSeller,
    onSwitchRole,
    onVerify
}) => {
    const displayAvatar = user.avatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${user.name}`;
    const displayCover = user.coverImageUrl || user.coverImage;
    const displayName = user.displayName || user.name;
    const handle = `@${user.name.toLowerCase().replace(/\s/g, '')}`;
    const social = user.socialLinks || {};
    
    const isSuspended = user.suspensionUntil && new Date(user.suspensionUntil) > new Date();

    return (
        <div className="relative mb-4">
            {/* Suspension Banner */}
            {isSuspended && (
                <div className="bg-red-600 text-white px-4 py-3 text-center text-sm font-bold animate-pulse">
                    ⚠️ This account is suspended until {formatSmartDate(user.suspensionUntil)}
                    {user.suspensionReason && (
                        <span className="block text-xs font-normal opacity-90 mt-1">Reason: {user.suspensionReason}</span>
                    )}
                </div>
            )}

            {/* Cover Image */}
            <div className="h-40 md:h-60 w-full relative bg-gray-200 overflow-hidden">
                {displayCover ? (
                    <img 
                        src={displayCover} 
                        alt="Cover" 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-700"></div>
                )}
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>

            <div className="px-4 md:px-8 relative">
                <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 md:-mt-16 mb-4 gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden relative group">
                            <img 
                                src={displayAvatar} 
                                alt={displayName}
                                className={`w-full h-full object-cover ${isSuspended ? 'grayscale' : ''}`}
                            />
                            {isSuspended && (
                                <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                                    <span className="text-2xl">🚫</span>
                                </div>
                            )}
                        </div>
                        {user.isVerifiedSeller && !isSuspended && (
                            <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Verified Seller">
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            </div>
                        )}
                    </div>

                    {/* Identity & Badges */}
                    <div className="flex-1 min-w-0 pt-2 md:pt-0 md:pb-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight truncate">{displayName}</h1>
                            {user.isVerifiedSeller && (
                                <span className="hidden md:inline-flex items-center text-[10px] font-bold uppercase tracking-wide border bg-green-50 text-green-700 border-green-200 px-2 py-0.5 rounded">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    Verified Seller
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 font-medium">{handle}</p>
                        
                        <div className="flex flex-wrap gap-2 mt-2 items-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${user.role === 'SELLER' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                {user.role}
                            </span>
                            
                            {user.location && (
                                <span className="flex items-center text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded bg-gray-50">
                                    <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {user.location} {user.isLocationVerified && <span className="text-green-500 ml-1" title="Verified Location">✓</span>}
                                </span>
                            )}
                        </div>

                        {/* Social Links */}
                        <div className="flex gap-2 mt-3">
                            {social.twitter && (
                                <a href={`https://twitter.com/${social.twitter.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:text-blue-400 hover:bg-blue-50 transition-colors">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                                </a>
                            )}
                            {social.instagram && (
                                <a href={`https://instagram.com/${social.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:text-pink-600 hover:bg-pink-50 transition-colors">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                </a>
                            )}
                            {social.discord && (
                                <div className="p-1.5 bg-gray-100 rounded-full text-gray-500 flex items-center justify-center relative group">
                                    <svg className="w-4 h-4 hover:text-indigo-500 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                                    {/* Tooltip for Discord ID */}
                                    <div className="absolute bottom-full mb-2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {social.discord}
                                    </div>
                                </div>
                            )}
                            {social.website && (
                                <a href={social.website.startsWith('http') ? social.website : `https://${social.website}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 md:pb-4">
                        {isOwnProfile ? (
                            <>
                                <button 
                                    onClick={onEdit}
                                    className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Edit Profile
                                </button>
                                {user.role === 'BUYER' ? (
                                    <button 
                                        onClick={onBecomeSeller}
                                        className="flex-1 md:flex-none px-4 py-2 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-colors shadow-sm"
                                    >
                                        Become Seller
                                    </button>
                                ) : (
                                    <button 
                                        onClick={onSwitchRole}
                                        className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        Switch to Buyer
                                    </button>
                                )}
                            </>
                        ) : (
                            // Admin / Public View Actions
                            <>
                                {onVerify && (
                                    <button 
                                        onClick={onVerify}
                                        className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        Verify Seller
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Bio */}
                <div className="max-w-2xl text-sm text-gray-600 leading-relaxed mb-6">
                    {user.bio ? user.bio : <span className="text-gray-400 italic">No bio added yet.</span>}
                </div>
            </div>
        </div>
    );
};
