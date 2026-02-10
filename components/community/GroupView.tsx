
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Group, Thread } from '../../types';
import { formatSmartDate } from '../../utils/dateUtils';
import { CreateThreadModal } from './CreateThreadModal';

interface GroupViewProps {
    group: Group;
    onNavigateThread: (threadId: string) => void;
    onBack: () => void;
}

export const GroupView: React.FC<GroupViewProps> = ({ group, onNavigateThread, onBack }) => {
    const { getGroupThreads, joinGroup, leaveGroup, currentUser } = useStore();
    const threads = getGroupThreads(group.id);
    const isMember = currentUser?.joinedGroupIds?.includes(group.id);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    const handleJoinToggle = () => {
        if (!currentUser) return alert("Please sign in to join groups.");
        if (isMember) {
            if (confirm("Leave this group?")) leaveGroup(group.id);
        } else {
            joinGroup(group.id);
        }
    };

    return (
        <div className="animate-fade-in-up pb-12">
            <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
                &larr; Back to Communities
            </button>

            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
                <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center text-4xl border border-primary-100">
                            {group.icon || '👥'}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                            <p className="text-gray-500 mt-1">{group.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                <span>{group.memberCount} Members</span>
                                <span>•</span>
                                <span>Active {formatSmartDate(group.lastActivityAt)}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleJoinToggle}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                            isMember 
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                            : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                        }`}
                    >
                        {isMember ? 'Joined ✓' : 'Join Group'}
                    </button>
                </div>
            </div>

            {/* Threads List */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Discussions</h2>
                    {isMember && (
                        <button 
                            onClick={() => setCreateModalOpen(true)}
                            className="text-sm font-bold text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            + New Post
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {threads.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
                            No threads yet. Be the first to post!
                        </div>
                    ) : (
                        threads.map(thread => (
                            <div 
                                key={thread.id} 
                                onClick={() => onNavigateThread(thread.id)}
                                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                            >
                                {thread.isPinned && (
                                    <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wider">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/></svg>
                                        Pinned
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg mb-1">{thread.title}</h3>
                                        <p className="text-gray-600 text-sm line-clamp-2">{thread.body}</p>
                                        
                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                                            <span className="font-medium text-gray-600">{thread.authorName}</span>
                                            <span>{formatSmartDate(thread.updatedAt)}</span>
                                            <div className="flex items-center gap-1">
                                                <span>💬 {thread.commentCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span>👍 {thread.upvotes}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {thread.images && thread.images.length > 0 && (
                                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                            <img src={thread.images[0]} className="w-full h-full object-cover" alt="Thread thumbnail" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <CreateThreadModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setCreateModalOpen(false)} 
                groupId={group.id} 
            />
        </div>
    );
};
