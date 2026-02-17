
import React, { useState } from 'react';
import { OnboardingFlow } from './OnboardingFlow';
import { PokemonType } from '../../types';

interface BuyerOnboardingProps {
    onComplete: () => void;
    onSkip: () => void;
}

export const BuyerOnboarding: React.FC<BuyerOnboardingProps> = ({ onComplete, onSkip }) => {
    // --- STEP STATES ---
    // Step 1: Interests
    const [selectedTypes, setSelectedTypes] = useState<PokemonType[]>([]);
    
    // Step 3: Practice Bid
    const [bidAmount, setBidAmount] = useState('');
    const [bidPlaced, setBidPlaced] = useState(false);

    // Step 4: Break Demo
    const [joinedBreak, setJoinedBreak] = useState(false);

    const toggleType = (type: PokemonType) => {
        if (selectedTypes.includes(type)) {
            setSelectedTypes(prev => prev.filter(t => t !== type));
        } else {
            setSelectedTypes(prev => [...prev, type]);
        }
    };

    const handleMockBid = (e: React.FormEvent) => {
        e.preventDefault();
        setBidPlaced(true);
    };

    const steps = [
        // 1. Welcome & Interests
        <div key="step1" className="space-y-6 text-center">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">
                👋
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome to Break-Hit!</h2>
            <p className="text-gray-600">Let's personalize your feed. What are you hunting for?</p>
            
            <div className="flex flex-wrap gap-3 justify-center">
                {Object.values(PokemonType).slice(0, 8).map(type => (
                    <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                            selectedTypes.includes(type)
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md transform scale-105'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">We'll show you cards matching these types first.</p>
        </div>,

        // 2. Marketplace Explain
        <div key="step2" className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">The Marketplace</h2>
            <p className="text-gray-600">Buy instantly or battle in auctions.</p>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white p-4 rounded-xl border-2 border-primary-100 shadow-sm">
                    <div className="text-2xl mb-2">⚡️</div>
                    <h3 className="font-bold text-gray-900">Buy Now</h3>
                    <p className="text-xs text-gray-500 mt-1">Instant purchase. Secure the card before someone else does.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-orange-100 shadow-sm">
                    <div className="text-2xl mb-2">🔨</div>
                    <h3 className="font-bold text-gray-900">Auctions</h3>
                    <p className="text-xs text-gray-500 mt-1">Place bids and outsmart other collectors. Sniping allowed!</p>
                </div>
            </div>
        </div>,

        // 3. Practice Bid
        <div key="step3" className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Try placing a bid</h2>
                <p className="text-gray-600 text-sm">Don't worry, this is just a simulation.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-w-sm mx-auto">
                <div className="aspect-[4/3] bg-gray-100 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">🐉</div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-center text-xs font-bold">
                        ENDS IN 05:00
                    </div>
                </div>
                <div className="p-4">
                    <h3 className="font-bold text-gray-900">Charizard Base Set (Demo)</h3>
                    <div className="flex justify-between mt-2 text-sm">
                        <span className="text-gray-500">Current Bid</span>
                        <span className="font-bold">$150.00</span>
                    </div>
                    
                    {!bidPlaced ? (
                        <form onSubmit={handleMockBid} className="mt-4 flex gap-2">
                            <input 
                                type="number" 
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                placeholder="$155+"
                                value={bidAmount}
                                onChange={e => setBidAmount(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                                Bid
                            </button>
                        </form>
                    ) : (
                        <div className="mt-4 bg-green-100 text-green-800 p-3 rounded-lg text-center font-bold text-sm animate-bounce-short">
                            🎉 Bid Placed! You are winning.
                        </div>
                    )}
                </div>
            </div>
        </div>,

        // 4. Breaks Explained
        <div key="step4" className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Live Breaks</h2>
            <p className="text-gray-600 text-sm">Buy a spot. Watch it opened live. We ship the hits.</p>

            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 max-w-sm mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-purple-900">151 Booster Box</span>
                    <span className="bg-purple-200 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">Live Break</span>
                </div>
                
                <div className="w-full bg-purple-200 rounded-full h-2.5 mb-2">
                    <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: joinedBreak ? '100%' : '80%' }}></div>
                </div>
                <p className="text-xs text-purple-700 mb-4 text-left">
                    {joinedBreak ? '10/10 Spots Filled (Ready to Schedule)' : '8/10 Spots Filled'}
                </p>

                {!joinedBreak ? (
                    <button 
                        onClick={() => setJoinedBreak(true)}
                        className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-700 transition-all"
                    >
                        Join Mock Break (Free)
                    </button>
                ) : (
                    <div className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Spot Secured!
                    </div>
                )}
                <p className="text-[10px] text-gray-500 mt-2">
                    In real breaks, you are only charged once the break fills.
                </p>
            </div>
        </div>,

        // 5. Final / Notifications
        <div key="step5" className="space-y-6 text-center">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">
                🔔
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Stay in the loop</h2>
            <p className="text-gray-600">Never miss a grail card or a live event.</p>
            
            <div className="space-y-3 max-w-xs mx-auto text-left">
                <label className="flex items-center gap-3 p-3 bg-white border rounded-xl">
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary-600 rounded" />
                    <span className="text-sm font-medium text-gray-900">Auction Ending Alerts</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-white border rounded-xl">
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary-600 rounded" />
                    <span className="text-sm font-medium text-gray-900">Live Break Notifications</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-white border rounded-xl">
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary-600 rounded" />
                    <span className="text-sm font-medium text-gray-900">Outbid Alerts</span>
                </label>
            </div>
        </div>
    ];

    return <OnboardingFlow steps={steps} role="BUYER" onComplete={onComplete} onSkip={onSkip} />;
};
