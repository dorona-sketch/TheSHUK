
import React, { useState, useRef } from 'react';
import { User, AppMode } from '../../types';
import { processImageUpload } from '../../utils/imageProcessing';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSave: (updates: Partial<User>) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, user, onSave }) => {
    const [displayName, setDisplayName] = useState(user.displayName || user.name);
    const [bio, setBio] = useState(user.bio || '');
    const [location, setLocation] = useState(user.location || '');
    const [sellerAbout, setSellerAbout] = useState(user.sellerAbout || '');
    const [preferredMode, setPreferredMode] = useState<AppMode>(user.preferredAppMode || AppMode.COMBINED);
    
    // Social Links State
    const [socials, setSocials] = useState({
        twitter: user.socialLinks?.twitter || '',
        instagram: user.socialLinks?.instagram || '',
        discord: user.socialLinks?.discord || '',
        website: user.socialLinks?.website || ''
    });

    // Image Staging
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingType, setUploadingType] = useState<'avatar' | 'cover' | null>(null);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingType(type);
        try {
            // Force 1:1 for Avatar, 3:1 for Cover
            const processed = await processImageUpload(file, {
                targetWidth: type === 'avatar' ? 400 : 1200,
                aspectRatio: type === 'avatar' ? 1 : 3
            });
            
            if (type === 'avatar') setAvatarPreview(processed);
            else setCoverPreview(processed);
        } catch (error) {
            console.error("Image processing failed", error);
            alert("Could not process image. Try a different file.");
        } finally {
            setUploadingType(null);
            // Reset input
            if (e.target) e.target.value = '';
        }
    };

    const handleSave = async () => {
        if (!displayName.trim()) return alert("Display Name is required");
        
        setIsSaving(true);
        const updates: Partial<User> = {
            displayName,
            name: displayName, // Sync legacy field
            bio,
            location,
            sellerAbout,
            preferredAppMode: preferredMode,
            socialLinks: {
                ...user.socialLinks, // keep existing ones if any (e.g. youtube/tiktok not in form)
                twitter: socials.twitter,
                instagram: socials.instagram,
                discord: socials.discord,
                website: socials.website
            }
        };

        // Only include images if they were changed
        if (avatarPreview) {
            updates.avatar = avatarPreview;
            updates.avatarUrl = avatarPreview;
        }
        if (coverPreview) {
            updates.coverImage = coverPreview;
            updates.coverImageUrl = coverPreview;
        }

        await onSave(updates);
        setIsSaving(false);
        onClose();
    };

    const currentAvatar = avatarPreview || user.avatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${user.name}`;
    const currentCover = coverPreview || user.coverImageUrl || user.coverImage;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">Edit Profile</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Visual Editor */}
                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Visuals</label>
                        
                        {/* Cover Preview & Edit */}
                        <div className="relative h-32 w-full bg-gray-200 rounded-xl overflow-hidden group border border-gray-200">
                            {currentCover ? (
                                <img src={currentCover} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-gray-300 to-gray-400"></div>
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => coverInputRef.current?.click()}
                                    className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm"
                                >
                                    {uploadingType === 'cover' ? 'Processing...' : 'Change Cover'}
                                </button>
                            </div>
                            <input ref={coverInputRef} type="file" className="hidden" accept="image/*" onChange={e => handleImageSelect(e, 'cover')} />
                        </div>

                        {/* Avatar Preview & Edit */}
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 rounded-full border-2 border-gray-200 overflow-hidden group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                <img src={currentAvatar} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold">Edit</span>
                                </div>
                                <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={e => handleImageSelect(e, 'avatar')} />
                            </div>
                            <div className="text-xs text-gray-500">
                                <p>Tap image to change.</p>
                                <p>Recommend square JPG/PNG.</p>
                            </div>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Display Name <span className="text-red-500">*</span></label>
                            <input 
                                value={displayName} 
                                onChange={e => setDisplayName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Collector Name"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Location</label>
                            <input 
                                value={location} 
                                onChange={e => setLocation(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                                placeholder="e.g. Tokyo, JP"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Bio</label>
                            <textarea 
                                value={bio} 
                                onChange={e => setBio(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                                rows={3}
                                placeholder="Tell us about your collection..."
                                maxLength={160}
                            />
                            <div className="text-right text-[10px] text-gray-400">{bio.length}/160</div>
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Social Links</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 mb-1">Twitter / X</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-2 text-gray-400">@</span>
                                    <input 
                                        value={socials.twitter} 
                                        onChange={e => setSocials({...socials, twitter: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg p-2 pl-6 text-sm focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="username"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 mb-1">Instagram</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-2 text-gray-400">@</span>
                                    <input 
                                        value={socials.instagram} 
                                        onChange={e => setSocials({...socials, instagram: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg p-2 pl-6 text-sm focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="username"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 mb-1">Discord</label>
                                <input 
                                    value={socials.discord} 
                                    onChange={e => setSocials({...socials, discord: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="user#1234"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 mb-1">Website</label>
                                <input 
                                    value={socials.website} 
                                    onChange={e => setSocials({...socials, website: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="myshop.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* App Preferences */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Default View</label>
                            <select 
                                value={preferredMode} 
                                onChange={e => setPreferredMode(e.target.value as AppMode)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                            >
                                <option value={AppMode.COMBINED}>Combined</option>
                                <option value={AppMode.MARKETPLACE}>Marketplace</option>
                                <option value={AppMode.BREAKS}>Breaks</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-3 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black disabled:opacity-50 shadow-md"
                    >
                        {isSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
};
