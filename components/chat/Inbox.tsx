
import React from 'react';
import { Conversation, User } from '../../types';
import { useChat } from '../../context/ChatContext';
import { formatSmartDate } from '../../utils/dateUtils';

interface InboxProps {
  currentUser: User;
  onSelect: (convId: string) => void;
  selectedId?: string;
}

export const Inbox: React.FC<InboxProps> = ({ currentUser, onSelect, selectedId }) => {
  const { conversations } = useChat();

  if (conversations.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-500">
              <div className="bg-gray-100 p-4 rounded-full mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start chatting with sellers directly from their listings.</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-900">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map(conv => {
          // Identify other participant
          const otherId = Object.keys(conv.participants).find(id => id !== currentUser.id) || '';
          const otherUser = conv.participants[otherId] || { name: 'Unknown User' };
          const unread = conv.unreadCounts[currentUser.id] || 0;
          const isSelected = selectedId === conv.id;

          // Standardized smart formatting
          const timeStr = formatSmartDate(conv.lastMessageAt);

          return (
            <div 
                key={conv.id} 
                onClick={() => onSelect(conv.id)}
                className={`flex gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
            >
                <div className="relative flex-shrink-0">
                    <img 
                        src={conv.listingImage} 
                        alt={conv.listingTitle} 
                        className="w-12 h-12 rounded-md object-cover border border-gray-200"
                    />
                    <div className="absolute -bottom-1 -right-1">
                        <img 
                            src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.name}`} 
                            alt={otherUser.name}
                            className="w-6 h-6 rounded-full border-2 border-white"
                        />
                    </div>
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                        <h3 className="font-semibold text-gray-900 truncate text-sm">{otherUser.name}</h3>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{timeStr}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate font-medium mb-1">{conv.listingTitle}</p>
                    <div className="flex justify-between items-center">
                        <p className={`text-sm truncate pr-2 ${unread > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                            {conv.lastMessage}
                        </p>
                        {unread > 0 && (
                            <span className="flex-shrink-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                {unread}
                            </span>
                        )}
                    </div>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
