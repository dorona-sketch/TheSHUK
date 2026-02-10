
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Thread, Comment } from '../../types';
import { formatSmartDate } from '../../utils/dateUtils';

interface ThreadViewProps {
    thread: Thread;
    onBack: () => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ thread, onBack }) => {
    const { getThreadComments, postComment, currentUser } = useStore();
    const comments = getThreadComments(thread.id);
    const [newComment, setNewComment] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        postComment(thread.id, newComment);
        setNewComment('');
    };

    return (
        <div className="animate-fade-in-up pb-12">
            <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
                &larr; Back to Group
            </button>

            {/* Original Post */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <img 
                        src={thread.authorAvatar || `https://ui-avatars.com/api/?name=${thread.authorName}`} 
                        className="w-10 h-10 rounded-full border border-gray-200"
                        alt={thread.authorName}
                    />
                    <div>
                        <div className="font-bold text-gray-900">{thread.authorName}</div>
                        <div className="text-xs text-gray-500">{formatSmartDate(thread.createdAt)}</div>
                    </div>
                </div>
                
                <h1 className="text-2xl font-extrabold text-gray-900 mb-4">{thread.title}</h1>
                <div className="prose prose-sm text-gray-800 max-w-none whitespace-pre-wrap mb-6">
                    {thread.body}
                </div>

                {thread.images && thread.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {thread.images.map((img, idx) => (
                            <img key={idx} src={img} className="rounded-lg border border-gray-200 w-full" alt="Thread attachment" />
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
                    <button className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                        <span className="text-lg">👍</span> {thread.upvotes}
                    </button>
                    <div className="flex items-center gap-1">
                        <span className="text-lg">💬</span> {thread.commentCount} Comments
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Comments</h3>
                
                <div className="space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900">{comment.authorName}</span>
                                    <span className="text-xs text-gray-400">• {formatSmartDate(comment.createdAt)}</span>
                                </div>
                            </div>
                            <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.body}</p>
                        </div>
                    ))}
                </div>

                {currentUser ? (
                    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl border border-gray-200 mt-6 shadow-sm sticky bottom-4">
                        <textarea 
                            className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                        />
                        <div className="flex justify-end mt-2">
                            <button 
                                type="submit" 
                                disabled={!newComment.trim()}
                                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Post Comment
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center p-4 bg-gray-100 rounded-lg text-sm text-gray-500">
                        Please sign in to comment.
                    </div>
                )}
            </div>
        </div>
    );
};
