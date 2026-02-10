
import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { Conversation, Message, Listing, User, MessageStatus, MessageType } from '../types';
import { chatService } from '../services/chatService';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeMessages: Message[];
  totalUnreadCount: number;
  loading: boolean;
  isTyping: boolean; // New: Is the other person typing?
  startConversation: (listing: Listing, seller: User) => Promise<Conversation>;
  selectConversation: (conversationId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: PropsWithChildren<{}>) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Track typing status per conversation
  const [typingStatus, setTypingStatus] = useState<{[convId: string]: boolean}>({});

  // Initialize service callbacks
  useEffect(() => {
      chatService.setTypingHandler((convId, isTyping) => {
          setTypingStatus(prev => ({ ...prev, [convId]: isTyping }));
      });
  }, []);

  // Poll for updates every 3 seconds to simulate realtime
  useEffect(() => {
    if (!user) {
        setConversations([]);
        return;
    }

    const fetch = async () => {
        const convs = await chatService.getConversations(user.id);
        // Simple JSON stringify comparison to avoid re-renders if deep equal
        setConversations(prev => JSON.stringify(prev) !== JSON.stringify(convs) ? convs : prev);

        if (activeConversation) {
            const updatedActive = convs.find(c => c.id === activeConversation.id);
            if (updatedActive) {
                // If unread count changed for me while active, likely a new message arrived
                // OR if last message time changed (outgoing message confirmed)
                if (updatedActive.lastMessageAt !== activeConversation.lastMessageAt) {
                    const msgs = await chatService.getMessages(updatedActive.id);
                    setActiveMessages(msgs);
                    
                    // Auto mark read if I'm looking at it
                    if (updatedActive.unreadCounts[user.id] > 0) {
                        await chatService.markAsRead(updatedActive.id, user.id);
                        updatedActive.unreadCounts[user.id] = 0;
                    }
                    setActiveConversation(updatedActive);
                }
            }
        }
    };

    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [user, activeConversation]);

  const startConversation = async (listing: Listing, seller: User) => {
    if (!user) throw new Error("Must be logged in");
    setLoading(true);
    // Note: buyer is current user
    const conv = await chatService.startConversation(listing, user, seller);
    setConversations(prev => {
        if (prev.find(c => c.id === conv.id)) return prev;
        return [conv, ...prev];
    });
    setLoading(false);
    return conv;
  };

  const selectConversation = async (conversationId: string) => {
    if (!user) return;
    // Clear typing status when switching
    setTypingStatus(prev => ({...prev, [conversationId]: false}));

    if (!conversationId) {
        setActiveConversation(null);
        setActiveMessages([]);
        return;
    }

    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
        setActiveConversation(conv);
        setLoading(true);
        const msgs = await chatService.getMessages(conversationId);
        setActiveMessages(msgs);
        setLoading(false);
        
        if (conv.unreadCounts[user.id] > 0) {
            await chatService.markAsRead(conv.id, user.id);
            // Optimistic update locally
            setConversations(prev => prev.map(c => c.id === conv.id ? {...c, unreadCounts: {...c.unreadCounts, [user.id]: 0}} : c));
        }
    }
  };

  const sendMessage = async (content: string) => {
      if (!user || !activeConversation) return;
      
      // Optimistic UI update
      const tempId = `temp_${Date.now()}`;
      const tempMsg: Message = {
          id: tempId,
          conversationId: activeConversation.id,
          senderId: user.id,
          content,
          createdAt: new Date().toISOString(),
          status: MessageStatus.SENT,
          type: MessageType.TEXT
      };
      setActiveMessages(prev => [...prev, tempMsg]);

      await chatService.sendMessage(activeConversation.id, user.id, content);
      
      // Refresh to get real ID and server state
      const realMsgs = await chatService.getMessages(activeConversation.id);
      setActiveMessages(realMsgs);
  };

  const markAsRead = async (conversationId: string) => {
      if (!user) return;
      await chatService.markAsRead(conversationId, user.id);
  };

  const refreshChats = async () => {
      if (user) {
          const convs = await chatService.getConversations(user.id);
          setConversations(convs);
      }
  };

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCounts[user?.id || ''] || 0), 0);
  const isTyping = activeConversation ? (typingStatus[activeConversation.id] || false) : false;

  return (
    <ChatContext.Provider value={{ 
        conversations, 
        activeConversation, 
        activeMessages, 
        totalUnreadCount, 
        loading,
        isTyping,
        startConversation, 
        selectConversation, 
        sendMessage,
        markAsRead,
        refreshChats
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
