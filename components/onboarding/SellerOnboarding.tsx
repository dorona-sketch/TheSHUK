
import React, { useState } from 'react';
import { OnboardingFlow } from './OnboardingFlow';

interface SellerOnboardingProps {
    onComplete: () => void;
    onSkip: () => void;
}

export const SellerOnboarding: React.FC<SellerOnboardingProps> = ({ onComplete, onSkip }) => {
    // Demo States
    const [profileName, setProfileName] = useState('');
    const [listingType, setListingType] = useState<'AUCTION' | 'BREAK' | ''>('');
    const [demoSpin, setDemoSpin] = useState(false);

    const steps = [
        // 1. Welcome Seller
        <div key="step1" className="space-y-6 text-center">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">
                💼
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Become a Seller</h2>
            <p className="text-gray-600">Turn your collection into cash. Host breaks, run auctions, and build a community.</p>
            <div className="bg-orange-50 p-4 rounded-xl text-sm text-orange-800 font-medium">
                🚀 Sellers get access to the Seller Dashboard and Live Host Tools.
            </div>
        </div>,

        // 2. Profile Quick Setup
        <div key="step2" className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Seller Profile</h2>
                <p className="text-gray-600 text-sm">Buyers trust sellers with completed profiles.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                        📸
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display Name</label>
                        <input 
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="e.g. Ash's Card Shop"
                            className="w-full border rounded-lg p-2 text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bio (Short)</label>
                    <textarea 
                        className="w-full border rounded-lg p-2 text-sm" 
                        rows={2} 
                        placeholder="I specialize in vintage WOTC..."
                    />
                </div>
            </div>
        </div>,

        // 3. Choose Format
        <div key="step3" className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">What will you list first?</h2>
            <p className="text-gray-600">You can do both, but pick one to practice.</p>
            
            <div className="grid grid-cols-1 gap-4 mt-4">
                <button 
                    onClick={() => setListingType('AUCTION')}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${listingType === 'AUCTION' ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 hover:border-gray-300'}`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🔨</span>
                        <span className="font-bold text-gray-900">Single Card Auction</span>
                    </div>
                    <p className="text-xs text-gray-500">Sell a single card or slab. Set a start price and duration.</p>
                </button>

                <button 
                    onClick={() => setListingType('BREAK')}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${listingType === 'BREAK' ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-gray-200 hover:border-gray-300'}`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📦</span>
                        <span className="font-bold text-gray-900">Timed Break</span>
                    </div>
                    <p className="text-xs text-gray-500">Open sealed product live. Sell spots to the community.</p>
                </button>
            </div>
        </div>,

        // 4. Live Tools Preview (Simplified)
        <div key="step4" className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Host Tools Preview</h2>
                <p className="text-gray-600 text-sm">We provide tools to make your streams pro.</p>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 text-white shadow-xl max-w-sm mx-auto">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                    <span className="text-xs font-bold uppercase text-gray-400">Control Panel</span>
                    <span className="text-red-500 text-xs font-bold animate-pulse">● LIVE</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-800 p-2 rounded text-center">
                        <div className="text-lg">📸</div>
                        <div className="text-[10px] text-gray-400">Card Scanner</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded text-center">
                        <div className="text-lg">🎲</div>
                        <div className="text-[10px] text-gray-400">Randomizer</div>
                    </div>
                </div>

                <button 
                    onClick={() => setDemoSpin(true)}
                    disabled={demoSpin}
                    className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-bold transition-colors"
                >
                    {demoSpin ? 'Spinning...' : 'Try "Spin Wheel"'}
                </button>

                {demoSpin && (
                    <div className="mt-4 p-3 bg-white text-gray-900 rounded-lg text-center animate-bounce-short">
                        <div className="text-xs font-bold text-purple-600 uppercase">Winner</div>
                        <div className="font-black text-xl">User123</div>
                    </div>
                )}
            </div>
        </div>,

        // 5. Trust & Shipping
        <div key="step5" className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Trust & Fulfillment</h2>
            <p className="text-gray-600">Key rules for selling on Break-Hit.</p>

            <ul className="text-left space-y-3 bg-blue-50 p-6 rounded-xl text-sm text-blue-900">
                <li className="flex items-start gap-3">
                    <span className="text-blue-500 font-bold">1.</span>
                    <span><strong>Ship within 3 days.</strong> Buyers love fast shipping.</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-blue-500 font-bold">2.</span>
                    <span><strong>Authenticity Guarantee.</strong> We may ask to verify high-value items.</span>
                </li>
                <li className="flex items-start gap-3">
                    <span className="text-blue-500 font-bold">3.</span>
                    <span><strong>Accurate Grading.</strong> Be honest about card conditions (NM, LP, MP).</span>
                </li>
            </ul>
        </div>
    ];

    return <OnboardingFlow steps={steps} role="SELLER" onComplete={onComplete} onSkip={onSkip} />;
};
