
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';

interface CreateThreadModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({ isOpen, onClose, groupId }) => {
    const { createThread } = useStore();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;
        
        createThread(groupId, title, body);
        setTitle('');
        setBody('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">Create New Post</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Title</label>
                        <input 
                            type="text" 
                            className="w-full border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                            placeholder="What's on your mind?"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Body</label>
                        <textarea 
                            className="w-full border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 min-h-[150px]"
                            placeholder="Share details..."
                            value={body}
                            onChange={e => setBody(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="mr-3 text-sm text-gray-600 hover:text-gray-900 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!title.trim() || !body.trim()}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 disabled:opacity-50"
                        >
                            Post
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
