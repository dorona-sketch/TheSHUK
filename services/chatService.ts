import { Conversation, Message, Listing, User, MessageStatus, MessageType } from '../types';

const CONV_KEY = 'break-hit_conversations';
const MSG_KEY = 'break-hit_messages';

// Typed callback for simulating real-time typing events
type TypingCallback = (conversationId: string, isTyping: boolean) => void;
let typingHandler: TypingCallback | null = null;

const getConversationsDB = (): Conversation[] => {
  const data = localStorage.getItem(CONV_KEY);
  return data ? JSON.parse(data) : [];
};

const saveConversationsDB = (convs: Conversation[]) => {
  localStorage.setItem(CONV_KEY, JSON.stringify(convs));
};

const getMessagesDB = (): Message[] => {
  const data = localStorage.getItem(MSG_KEY);
  return data ? JSON.parse(data) : [];
};

const saveMessagesDB = (msgs: Message[]) => {
  localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
};

export const chatService = {
  
  setTypingHandler(callback: TypingCallback) {
      typingHandler = callback;
  },

  async startConversation(listing: Listing, buyer: User, seller: User): Promise<Conversation> {
    // Reduced latency
    await new Promise(r => setTimeout(r, 100));
    
    let convs = getConversationsDB();
    
    const existing = convs.find(c => 
      c.listingId === listing.id && 
      c.buyerId === buyer.id && 
      c.sellerId === seller.id
    );

    if (existing) return existing;

    // Create a System Message for the start
    const systemMsg: Message = {
        id: `m_sys_${Date.now()}`,
        conversationId: 'temp_id', // Will be updated below
        senderId: 'SYSTEM',
        content: `Conversation started about ${listing.title}`,
        createdAt: new Date().toISOString(),
        status: MessageStatus.READ,
        type: MessageType.SYSTEM
    };

    const newConv: Conversation = {
      id: `c_${Math.random().toString(36).substr(2, 9)}`,
      listingId: listing.id,
      listingTitle: listing.title,
      listingImage: listing.imageUrl,
      listingPrice: listing.price,
      buyerId: buyer.id,
      sellerId: seller.id,
      participants: {
        [buyer.id]: { name: buyer.name, avatar: buyer.avatar },
        [seller.id]: { name: seller.name, avatar: seller.avatar }
      },
      lastMessage: 'Conversation started',
      lastMessageAt: new Date().toISOString(),
      unreadCounts: {
        [buyer.id]: 0,
        [seller.id]: 0
      },
      isBlocked: false
    };

    systemMsg.conversationId = newConv.id;

    convs.push(newConv);
    saveConversationsDB(convs);
    
    // Save system message
    const allMsgs = getMessagesDB();
    allMsgs.push(systemMsg);
    saveMessagesDB(allMsgs);

    return newConv;
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    const convs = getConversationsDB();
    return convs
      .filter(c => c.buyerId === userId || c.sellerId === userId)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const allMsgs = getMessagesDB();
    return allMsgs
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    // Reduced latency for snappy chats
    await new Promise(r => setTimeout(r, 50));

    const newMessage: Message = {
      id: `m_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId,
      content,
      createdAt: new Date().toISOString(),
      status: MessageStatus.SENT,
      type: MessageType.TEXT
    };

    const msgs = getMessagesDB();
    msgs.push(newMessage);
    saveMessagesDB(msgs);

    const convs = getConversationsDB();
    const convIdx = convs.findIndex(c => c.id === conversationId);
    
    if (convIdx !== -1) {
      const conv = convs[convIdx];
      conv.lastMessage = content;
      conv.lastMessageAt = newMessage.createdAt;
      
      Object.keys(conv.unreadCounts).forEach(pid => {
        if (pid !== senderId) {
          conv.unreadCounts[pid] = (conv.unreadCounts[pid] || 0) + 1;
        }
      });
      
      convs[convIdx] = conv;
      saveConversationsDB(convs);

      const otherParticipantId = Object.keys(conv.participants).find(pid => pid !== senderId);
      if (otherParticipantId && (otherParticipantId === 'u_seller_01' || otherParticipantId === 'u_seller_02')) {
         this.scheduleBotReply(conversationId, otherParticipantId);
      }
    }

    return newMessage;
  },

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const convs = getConversationsDB();
    const convIdx = convs.findIndex(c => c.id === conversationId);
    if (convIdx !== -1) {
      const conv = convs[convIdx];
      // Only update if there are unread messages
      if (conv.unreadCounts[userId] > 0) {
        conv.unreadCounts[userId] = 0;
        convs[convIdx] = conv;
        saveConversationsDB(convs);

        // Update status of messages sent to this user to READ
        const msgs = getMessagesDB();
        let changed = false;
        msgs.forEach(m => {
            if (m.conversationId === conversationId && m.senderId !== userId && m.status !== MessageStatus.READ) {
                m.status = MessageStatus.READ;
                changed = true;
            }
        });
        if (changed) saveMessagesDB(msgs);
      }
    }
  },

  scheduleBotReply(conversationId: string, botId: string) {
      const self = this;
      // 1. Start Typing after short delay
      setTimeout(() => {
          if (typingHandler) typingHandler(conversationId, true);
          
          // 2. Stop Typing and Send Message
          setTimeout(() => {
            if (typingHandler) typingHandler(conversationId, false);

            const replies = [
                "Thanks for the message! I'm open to offers.",
                "Yes, it's still available.",
                "Condition is exactly as described.",
                "I can ship it out tomorrow.",
                "Would you do $5 less?",
                "Sorry, firm on price."
            ];
            const reply = replies[Math.floor(Math.random() * replies.length)];
            self.sendMessage(conversationId, botId, reply);
          }, 2500); // 2.5s typing duration

      }, 1000); // 1s before typing starts
  }
};