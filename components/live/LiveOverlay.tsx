
import React, { useEffect, useState } from 'react';
import { LiveEvent, LiveEventType } from '../../types';

interface LiveOverlayProps {
    event: LiveEvent | null;
}

export const LiveOverlay: React.FC<LiveOverlayProps> = ({ event }) => {
    const [animationState, setAnimationState] = useState<'IDLE' | 'ENTER' | 'EXIT'>('IDLE');
    const [displayEvent, setDisplayEvent] = useState<LiveEvent | null>(null);
    const [wheelRotation, setWheelRotation] = useState(0);

    useEffect(() => {
        if (event && event.id !== displayEvent?.id) {
            setAnimationState('ENTER');
            setDisplayEvent(event);
            
            if (event.type === LiveEventType.WHEEL_SPIN) {
                setWheelRotation(0);
                setTimeout(() => {
                    const spins = 8;
                    const randomOffset = Math.random() * 360; 
                    setWheelRotation(360 * spins + randomOffset);
                }, 100);
            }

            let duration = 5000;
            // Safe access to payload properties
            if (event.type === LiveEventType.CARD_REVEAL && event.payload?.isChase) duration = 8000;
            if (event.type === LiveEventType.WHEEL_SPIN) duration = 7000; 

            const timer = setTimeout(() => {
                setAnimationState('EXIT');
                setTimeout(() => {
                    setAnimationState('IDLE');
                    setDisplayEvent(null);
                    setWheelRotation(0);
                }, 500); 
            }, duration);
            
            return () => clearTimeout(timer);
        }
    }, [event]);

    if (!displayEvent || animationState === 'IDLE' || !displayEvent.payload) return null;

    const containerClass = `absolute inset-x-0 top-[15%] flex justify-center z-30 pointer-events-none px-4 transition-all duration-500 transform ${
        animationState === 'ENTER' ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
    }`;

    // --- RENDERERS ---

    const renderWheelSpin = (payload: any) => (
        <div className="relative flex flex-col items-center justify-center">
            {/* Pointer */}
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-500 absolute top-[-15px] z-20 drop-shadow-lg filter"></div>
            
            {/* Wheel */}
            <div 
                className="w-64 h-64 md:w-80 md:h-80 rounded-full border-8 border-white shadow-2xl bg-[conic-gradient(from_0deg,#ec4899_0deg_90deg,#8b5cf6_90deg_180deg,#3b82f6_180deg_270deg,#10b981_270deg_360deg)] relative overflow-hidden transition-transform duration-[4000ms] cubic-bezier(0.15, 0.85, 0.35, 1.05)"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
            >
                <div className="absolute inset-0 rounded-full border-4 border-black/10"></div>
                <div className="absolute inset-0 flex items-center justify-center text-white font-black text-6xl drop-shadow-md animate-pulse">
                    ?
                </div>
            </div>

            {/* Winner Reveal Card */}
            <div 
                className="absolute top-full mt-8 bg-white text-gray-900 px-10 py-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-yellow-400 transform transition-all duration-500 delay-[4000ms] scale-0"
                style={{ 
                    transform: wheelRotation > 0 ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(20px)',
                    opacity: wheelRotation > 0 ? 1 : 0
                }}
            >
                <div className="text-xs font-bold text-purple-600 uppercase tracking-widest text-center mb-1">Big Winner</div>
                <div className="text-4xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                    {payload.winner || 'Unknown'}
                </div>
            </div>
        </div>
    );

    const renderCardReveal = (payload: any) => {
        const { cardName = 'Unknown Card', price = 0, isChase = false, imageUrl } = payload;
        
        if (isChase) {
            return (
                <div className="relative max-w-md w-full animate-bounce-short">
                    {/* Confetti Particles (CSS Only approximation) */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, animationDelay: `${i*0.2}s` }}></div>
                        ))}
                    </div>

                    {/* Glow Effect */}
                    <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-3xl blur-xl opacity-60 animate-pulse"></div>
                    
                    <div className="relative bg-gray-900 border-4 border-yellow-400 rounded-2xl overflow-hidden shadow-2xl transform rotate-1">
                        {/* Chase Header */}
                        <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-3 text-center border-b border-white/20">
                            <h2 className="text-3xl font-black text-white italic tracking-tighter drop-shadow-md uppercase flex items-center justify-center gap-2">
                                <span className="text-2xl">🔥</span> CHASE HIT <span className="text-2xl">🔥</span>
                            </h2>
                        </div>
                        
                        <div className="flex p-5 gap-5 bg-gradient-to-b from-gray-800 to-gray-900">
                            <div className="w-32 shrink-0">
                                <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden border-2 border-yellow-400/50 shadow-lg relative group">
                                    {imageUrl && (
                                        <img src={imageUrl} className="w-full h-full object-cover" alt={cardName} />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/20 to-transparent mix-blend-overlay"></div>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="text-yellow-400 font-bold text-xs uppercase tracking-wide mb-1">Identified Card</div>
                                <div className="text-white font-extrabold text-2xl leading-none mb-3 drop-shadow-sm">{cardName}</div>
                                
                                {price > 0 && (
                                    <div className="bg-black/40 rounded-xl p-3 border border-white/10 inline-block backdrop-blur-sm">
                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Est. Market Value</div>
                                        <div className="text-green-400 font-mono font-bold text-3xl tracking-tight text-shadow">${price}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Standard Hit
        return (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 pr-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-gray-100 flex items-center gap-4 max-w-sm mx-auto mt-20 transform -rotate-1">
                <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 shadow-inner">
                    {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <span className="text-2xl flex items-center justify-center h-full">🃏</span>}
                </div>
                <div className="text-left min-w-0">
                    <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Pulled</div>
                    <div className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{cardName}</div>
                    {price > 0 && <div className="font-mono text-green-600 font-bold text-sm mt-0.5">${price}</div>}
                </div>
            </div>
        );
    };

    const renderRandomize = (payload: any) => {
        if (!payload.order) return null;
        return (
            <div className="bg-gray-900/95 backdrop-blur-md rounded-xl p-6 text-center border border-gray-700 max-w-xs mx-auto shadow-2xl mt-10">
                <h3 className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center justify-center gap-2">
                    <span className="animate-spin">🎲</span> Randomized List
                </h3>
                <div className="space-y-1.5 relative">
                    {payload.order.slice(0, 5).map((name: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 text-sm animate-fade-in-up bg-gray-800/50 p-1.5 rounded-lg border border-gray-700" style={{ animationDelay: `${idx * 100}ms` }}>
                            <span className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[10px] font-mono text-white font-bold">{idx + 1}</span>
                            <span className="text-white font-medium truncate">{name}</span>
                        </div>
                    ))}
                    {payload.order.length > 5 && (
                        <div className="text-xs text-gray-500 italic mt-2">
                            ...and {payload.order.length - 5} others
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderGeneric = (type: string, payload: any) => (
        <div className="bg-black/80 backdrop-blur-md text-white px-8 py-4 rounded-full font-bold text-lg text-center shadow-xl mx-auto w-fit border border-white/10 mt-32 animate-bounce-short">
            {payload.message || type}
        </div>
    );

    return (
        <div className={containerClass}>
            {displayEvent.type === LiveEventType.WHEEL_SPIN && renderWheelSpin(displayEvent.payload)}
            {displayEvent.type === LiveEventType.CARD_REVEAL && renderCardReveal(displayEvent.payload)}
            {displayEvent.type === LiveEventType.RANDOMIZE_LIST && renderRandomize(displayEvent.payload)}
            {(displayEvent.type === LiveEventType.BREAK_START || displayEvent.type === LiveEventType.BREAK_END || displayEvent.type === LiveEventType.SYSTEM_MSG) && renderGeneric(displayEvent.type, displayEvent.payload)}
        </div>
    );
};
