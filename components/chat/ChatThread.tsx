
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Conversation, User, Message, MessageType, MessageStatus } from '../../types';
import { useChat } from '../../context/ChatContext';
import { formatChatTimestamp, getRelativeDateLabel } from '../../utils/dateUtils';

interface ChatThreadProps {
  conversation: Conversation;
  currentUser: User;
  onBack?: () => void; // For mobile
}

// Quick reply options for Buyers
const QUICK_REPLIES = [
    "Is this still available?",
    "What's the condition?",
    "Can you ship today?",
    "Would you take an offer?",
    "Do you have more photos?"
];

// --- Sub-Components ---

const DateSeparator: React.FC<{ dateLabel: string }> = ({ dateLabel }) => (
    <div className="flex justify-center my-4">
        <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
            {dateLabel}
        </span>
    </div>
);

const TypingBubble = () => (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 w-16">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

const ReadReceipt: React.FC<{ status: MessageStatus }> = ({ status }) => {
    if (status === MessageStatus.READ) {
        return (
            <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
        );
    }
    return (
         <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
         </svg>
    );
};

export const ChatThread: React.FC<ChatThreadProps> = ({ conversation, currentUser, onBack }) => {
  const { activeMessages, sendMessage, isTyping } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const otherId = Object.keys(conversation.participants).find(id => id !== currentUser.id) || '';
  const otherUser = conversation.participants[otherId] || { name: 'User' };

  // Group messages by relative date
  const groupedMessages = useMemo(() => {
      const groups: { dateLabel: string, msgs: Message[] }[] = [];
      
      activeMessages.forEach(msg => {
          const label = getRelativeDateLabel(msg.createdAt);

          if (groups.length === 0 || groups[groups.length - 1].dateLabel !== label) {
              groups.push({ dateLabel: label, msgs: [] });
          }
          groups[groups.length - 1].msgs.push(msg);
      });
      return groups;
  }, [activeMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newMessage.trim()) return;
      
      const content = newMessage;
      setNewMessage(''); 
      await sendMessage(content);
  };

  const handleQuickReply = (text: string) => {
      setNewMessage('');
      sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm border-b border-gray-200 z-10 sticky top-0">
        <div className="flex items-center gap-3">
             {onBack && (
                 <button onClick={onBack} className="md:hidden text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                     </svg>
                 </button>
             )}
             <div className="relative">
                 <img 
                    src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.name}`} 
                    className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                    alt="User"
                 />
                 <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></span>
             </div>
             <div>
                 <h2 className="text-sm font-bold text-gray-900 leading-tight">{otherUser.name}</h2>
                 <p className="text-xs text-green-600 font-medium">Online</p>
             </div>
        </div>

        {/* Listing Context Pill */}
        <div className="hidden sm:flex items-center gap-3 bg-white border border-gray-200 pl-1 pr-3 py-1 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer">
             <img src={conversation.listingImage} className="w-8 h-8 rounded-full object-cover" alt="Listing" />
             <div className="flex flex-col justify-center">
                 <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{conversation.listingTitle}</p>
                 <p className="text-[10px] text-gray-500">${conversation.listingPrice.toLocaleString()}</p>
             </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {groupedMessages.map((group, gIdx) => (
              <div key={gIdx}>
                  <DateSeparator dateLabel={group.dateLabel} />
                  <div className="space-y-1.5">
                      {group.msgs.map((msg, idx) => {
                          if (msg.type === MessageType.SYSTEM) {
                              return (
                                  <div key={msg.id} className="flex justify-center my-2">
                                      <span className="text-xs text-gray-400 italic bg-gray-100 px-3 py-1 rounded-full">
                                          {msg.content}
                                      </span>
                                  </div>
                              );
                          }

                          const isMe = msg.senderId === currentUser.id;
                          const showAvatar = !isMe && (idx === group.msgs.length - 1 || group.msgs[idx + 1]?.senderId !== msg.senderId);
                          
                          // Bubble styles
                          const bubbleClass = isMe 
                              ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm' 
                              : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm';

                          return (
                              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}>
                                  <div className={`flex items-end max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                                      {/* Avatar Column */}
                                      <div className="w-8 flex-shrink-0">
                                          {!isMe && showAvatar && (
                                            <img 
                                                src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.name}`} 
                                                className="w-8 h-8 rounded-full object-cover"
                                                alt="Avatar"
                                            />
                                          )}
                                      </div>
                                      
                                      {/* Message Content */}
                                      <div className="flex flex-col">
                                          <div className={`px-4 py-2 text-sm leading-relaxed break-words relative ${bubbleClass}`}>
                                              {msg.content}
                                          </div>
                                          
                                          {/* Meta Row */}
                                          <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                              <span className="text-[10px] text-gray-400">
                                                  {formatChatTimestamp(msg.createdAt)}
                                              </span>
                                              {isMe && <ReadReceipt status={msg.status} />}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          ))}
          
          {isTyping && (
              <div className="flex justify-start mb-2 ml-10">
                  <TypingBubble />
              </div>
          )}
          
          <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200">
          {/* Quick Replies */}
          {!newMessage && currentUser.role === 'BUYER' && (
              <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
                  {QUICK_REPLIES.map((reply, i) => (
                      <button 
                        key={i}
                        onClick={() => handleQuickReply(reply)}
                        className="flex-shrink-0 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors whitespace-nowrap"
                      >
                          {reply}
                      </button>
                  ))}
              </div>
          )}

          <div className="p-3">
              <form onSubmit={handleSend} className="flex gap-2 items-end">
                  <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                  <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-1.5 focus-within:ring-2 focus-within:ring-primary-500 focus-within:bg-white transition-all">
                      <textarea 
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type a message..."
                          rows={1}
                          className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none resize-none py-2.5 max-h-24"
                      />
                  </div>
                  <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-3 transition-colors shadow-sm mb-0.5"
                  >
                      <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                  </button>
              </form>
          </div>
      </div>
    </div>
  );
};
