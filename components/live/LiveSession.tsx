
import React, { useState, useEffect, useRef } from 'react';
import { Listing, User, LiveEvent, BreakEntry, LiveChatMessage } from '../../types';
import { useStore } from '../../context/StoreContext';
import { LiveOverlay } from './LiveOverlay';
import { HostControls } from './HostControls';
import { formatChatTimestamp } from '../../utils/dateUtils';

interface LiveSessionProps {
    listing: Listing;
    currentUser: User | null;
    onBack: () => void;
}

// Pluggable Video Player Component
const StreamPlayer: React.FC<{ url?: string; poster?: string }> = ({ url, poster }) => {
    if (!url) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-900/50 backdrop-blur-sm">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-700 shadow-inner">
                    <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-1">Stream Offline</h3>
                <p className="text-xs text-gray-500">Waiting for host to connect feed...</p>
            </div>
        );
    }

    const getEmbedUrl = (rawUrl: string) => {
        if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
            const videoId = rawUrl.split('v=')[1]?.split('&')[0] || rawUrl.split('/').pop();
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1&rel=0`;
        }
        if (rawUrl.includes('twitch.tv')) {
            const channel = rawUrl.split('/').pop();
            return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&muted=false`;
        }
        return rawUrl;
    };

    return (
        <div className="w-full h-full bg-black relative">
            <iframe 
                src={getEmbedUrl(url)} 
                className="w-full h-full absolute inset-0 border-0" 
                allowFullScreen 
                allow="autoplay; encrypted-media; picture-in-picture"
            />
        </div>
    );
};

const MOCK_MESSAGES = [
    "Let's goooo!", "Hoping for that Charizard", "Good luck everyone!", "Is this the last box?", "Nice hit!", "Ooooof 🔥", "Sheesh", "Can't wait for my turn"
];

export const LiveSession: React.FC<LiveSessionProps> = ({ listing, currentUser, onBack }) => {
    const { getLiveEvents, getBreakEntries, liveChatHistory, addLiveChatMessage } = useStore();
    
    // Retrieve messages from global store or default to system welcome
    const messages = liveChatHistory[listing.id] || [
        { id: 'sys_1', listingId: listing.id, sender: 'System', text: `Welcome to the break for ${listing.title}!`, isSystem: true, timestamp: new Date() }
    ];

    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    // Live Event State
    const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null);
    const [entries, setEntries] = useState<BreakEntry[]>([]);

    const isHost = currentUser?.id === listing.sellerId;

    useEffect(() => {
        setEntries(getBreakEntries(listing.id));
    }, [listing.id, getBreakEntries]);

    useEffect(() => {
        const fetchEvents = () => {
            const events = getLiveEvents(listing.id);
            if (events.length > 0) {
                const latest = events[events.length - 1];
                if (!lastEvent || latest.id !== lastEvent.id) {
                    setLastEvent(latest);
                    if (latest.type !== 'SYSTEM_MSG') { 
                        let msgText = '';
                        if (latest.type === 'WHEEL_SPIN') msgText = `🏆 Wheel Winner: ${latest.payload.winner}`;
                        if (latest.type === 'CARD_REVEAL') msgText = `🃏 Pulled: ${latest.payload.cardName} ${latest.payload.price ? `($${latest.payload.price})` : ''}`;
                        if (latest.type === 'RANDOMIZE_LIST') msgText = `🎲 List Randomized!`;
                        if (latest.type === 'BREAK_START') msgText = `🔴 Break Started!`;
                        if (latest.type === 'BREAK_END') msgText = `🏁 Break Ended. Thanks for watching!`;
                        
                        if (msgText) addMessage('System', msgText, true);
                    } else if (latest.type === 'SYSTEM_MSG') {
                        addMessage('Host', latest.payload.message, true);
                    }
                }
            }
        };
        fetchEvents();
        const interval = setInterval(fetchEvents, 1000);
        return () => clearInterval(interval);
    }, [listing.id, lastEvent, getLiveEvents]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Simulate community chatter (Only if chat is sparse)
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.85 && messages.length < 50) {
                const text = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
                const randomUser = `User${Math.floor(Math.random() * 100)}`;
                addMessage(randomUser, text, false);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [messages.length]);

    const addMessage = (sender: string, text: string, isSystem: boolean = false) => {
        const msg: LiveChatMessage = { 
            id: `m_${Date.now()}_${Math.random()}`, 
            listingId: listing.id,
            sender, 
            text, 
            isSystem,
            timestamp: new Date(),
            avatar: isSystem ? undefined : `https://ui-avatars.com/api/?name=${sender}&background=random`
        };
        addLiveChatMessage(listing.id, msg);
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;
        const sender = currentUser.name;
        addMessage(sender, newMessage);
        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-black text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs font-bold uppercase tracking-wide transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Exit
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-white leading-tight truncate max-w-[200px] md:max-w-md">{listing.title}</h1>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded text-red-500 text-[10px] font-bold border border-red-500/20 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> LIVE
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">{entries.length} Participants</span>
                        </div>
                    </div>
                </div>
                {listing.seed && (
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] text-gray-600 font-mono">Fairness Seed</span>
                        <span className="text-[10px] text-gray-500 font-mono bg-gray-800 px-1.5 rounded">{listing.seed.substring(0, 12)}...</span>
                    </div>
                )}
                {!currentUser && (
                    <div className="hidden md:block text-xs text-gray-400">Viewing as Guest</div>
                )}
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Main Stage (Video + Overlay) */}
                <div className="flex-1 bg-black relative flex flex-col justify-center order-1 md:order-1">
                    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group">
                        <StreamPlayer url={listing.liveLink} />
                        <LiveOverlay event={lastEvent} />
                    </div>

                    {/* Host Controls Panel (Overlay on Desktop, stacked on Mobile) */}
                    {isHost && (
                        <div className="relative z-40 bg-gray-900 border-t border-gray-800">
                            <HostControls listing={listing} entries={entries} />
                        </div>
                    )}
                </div>

                {/* Sidebar (Chat) */}
                <div className="w-full md:w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-1/3 md:h-full shrink-0 order-2 md:order-2 z-10 shadow-xl">
                    <div className="flex border-b border-gray-800 bg-gray-900">
                        <button className="flex-1 py-3 text-xs font-bold text-white border-b-2 border-primary-500 bg-gray-800/50">Live Chat</button>
                        <button className="flex-1 py-3 text-xs font-bold text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 transition-colors">Participants ({entries.length})</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-900">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-2 animate-fade-in-up ${msg.isSystem ? 'justify-center' : ''}`}>
                                {msg.isSystem ? (
                                    <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-center my-2 max-w-[90%]">
                                        <p className="text-xs text-yellow-400 font-bold uppercase tracking-wide mb-0.5">{msg.sender}</p>
                                        <p className="text-xs text-gray-300">{msg.text}</p>
                                    </div>
                                ) : (
                                    <>
                                        <img src={msg.avatar} className="w-6 h-6 rounded-full mt-0.5 opacity-80" alt={msg.sender} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-xs font-bold ${msg.sender === currentUser?.name ? 'text-primary-400' : 'text-gray-400'}`}>
                                                    {msg.sender}
                                                </span>
                                                <span className="text-[10px] text-gray-600">
                                                    {formatChatTimestamp(msg.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-200 break-words leading-snug">{msg.text}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSend} className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder-gray-500 disabled:opacity-50"
                            placeholder={currentUser ? "Chat..." : "Sign in to chat"}
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            disabled={!currentUser}
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim() || !currentUser}
                            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
