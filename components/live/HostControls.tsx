
import React, { useState, useRef } from 'react';
import { LiveEventType, Listing, BreakEntry, CardCandidate } from '../../types';
import { useStore } from '../../context/StoreContext';
import { CardRecognitionService } from '../../services/cardRecognitionService';

interface HostControlsProps {
    listing: Listing;
    entries: BreakEntry[];
}

interface ReviewData {
    cardName: string;
    price: string;
    isChase: boolean;
    imageUrl: string;
}

export const HostControls: React.FC<HostControlsProps> = ({ listing, entries }) => {
    const { publishLiveEvent } = useStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState('');
    const [reviewData, setReviewData] = useState<ReviewData | null>(null);
    const [candidates, setCandidates] = useState<CardCandidate[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCameraGuide, setShowCameraGuide] = useState(false);

    const processFile = async (file: File) => {
        setIsProcessing(true);
        setCandidates([]);
        setProcessingStage("Scanning...");
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const b64 = (reader.result as string).split(',')[1];
            try {
                const res = await CardRecognitionService.identify(b64);
                
                if (res.candidates.length === 0) {
                    alert("No card recognized. Please try again or enter manually.");
                    setIsProcessing(false);
                } else if (res.candidates.length === 1) {
                    // Exact match
                    await selectCandidate(res.candidates[0], reader.result as string);
                } else {
                    // Ambiguous - Show Selection UI
                    setCandidates(res.candidates);
                    setProcessingStage("Select Match");
                    // Note: We keep isProcessing true to show the UI state
                }
            } catch (e) {
                console.error(e);
                setIsProcessing(false);
            }
        };
    };

    const selectCandidate = async (match: CardCandidate, fallbackImage: string) => {
        setCandidates([]); // Clear selection list
        setProcessingStage("Analyzing Value...");
        
        try {
            const { isChase, price } = await CardRecognitionService.analyzeChaseStatus(match);
            
            setReviewData({
                cardName: match.cardName,
                price: price.toString(),
                isChase,
                imageUrl: match.imageUrl || fallbackImage
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
            setProcessingStage('');
        }
    };

    const handleBroadcast = () => {
        if (!reviewData) return;
        publishLiveEvent(listing.id, LiveEventType.CARD_REVEAL, {
            cardName: reviewData.cardName,
            price: parseFloat(reviewData.price),
            isChase: reviewData.isChase,
            imageUrl: reviewData.imageUrl
        });
        setReviewData(null);
    };

    const handleWheelSpin = () => {
        if (entries.length === 0) return alert("No participants to spin for!");
        // Simulate spin delay
        const winner = entries[Math.floor(Math.random() * entries.length)].userName;
        publishLiveEvent(listing.id, LiveEventType.WHEEL_SPIN, { winner });
    };

    const handleRandomize = () => {
        if (entries.length === 0) return;
        const shuffled = [...entries].sort(() => 0.5 - Math.random()).map(e => e.userName);
        publishLiveEvent(listing.id, LiveEventType.RANDOMIZE_LIST, { order: shuffled });
    };

    const openCameraWithGuide = () => setShowCameraGuide(true);

    const launchCameraCapture = () => {
        setShowCameraGuide(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    return (
        <div className="bg-gray-900 border-t border-gray-800 p-4">
            {showCameraGuide && (
                <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-center">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Center the card</h4>
                        <p className="text-sm text-gray-600 mb-4">Keep the full card inside the green frame before taking the photo.</p>
                        <div className="mx-auto relative w-52 h-72 mb-5">
                            <div className="absolute inset-0 border-4 border-emerald-500 rounded-2xl"></div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowCameraGuide(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold">Cancel</button>
                            <button type="button" onClick={launchCameraCapture} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">Open Camera</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between mb-3">
                <h3 className="text-gray-400 text-xs font-bold uppercase">Host Controls</h3>
                {isProcessing && <span className="text-yellow-400 text-xs animate-pulse">{processingStage}</span>}
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
                <button onClick={openCameraWithGuide} className="p-3 bg-blue-900 text-blue-100 rounded-lg flex flex-col items-center">
                    <span className="text-xl">📸</span><span className="text-[10px] font-bold">Scan Hit</span>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
                </button>
                <button onClick={handleWheelSpin} className="p-3 bg-purple-900 text-purple-100 rounded-lg flex flex-col items-center">
                    <span className="text-xl">🎡</span><span className="text-[10px] font-bold">Spin Wheel</span>
                </button>
                <button onClick={handleRandomize} className="p-3 bg-gray-800 text-gray-300 rounded-lg flex flex-col items-center">
                    <span className="text-xl">🎲</span><span className="text-[10px] font-bold">Randomize</span>
                </button>
            </div>

            {/* Candidate Selection Modal */}
            {candidates.length > 0 && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-4 max-h-[80vh] flex flex-col">
                        <h3 className="font-bold text-gray-900 mb-2">Select Correct Card</h3>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {candidates.map((c, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => selectCandidate(c, c.imageUrl || '')}
                                    className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded cursor-pointer border border-transparent hover:border-blue-200"
                                >
                                    <img src={c.imageUrl} className="w-10 h-14 object-contain bg-gray-100" />
                                    <div>
                                        <div className="font-bold text-sm">{c.cardName}</div>
                                        <div className="text-xs text-gray-500">{c.setName} • {c.rarity}</div>
                                        {c.variant && <div className="text-xs text-blue-600 font-medium">{c.variant}</div>}
                                        {c.visualSimilarity && <div className="text-[10px] text-green-600">Match Score: {Math.round(c.visualSimilarity * 100)}%</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { setCandidates([]); setIsProcessing(false); }} className="mt-4 w-full py-2 bg-gray-100 text-gray-600 rounded font-medium">Cancel</button>
                    </div>
                </div>
            )}

            {/* Review & Broadcast Modal */}
            {reviewData && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-4">
                        <img src={reviewData.imageUrl} className="h-40 mx-auto object-contain mb-4" />
                        <input className="w-full border p-2 mb-2 font-bold" value={reviewData.cardName} onChange={e => setReviewData({...reviewData, cardName: e.target.value})} />
                        <div className="flex gap-2 mb-4">
                            <input className="border p-2 flex-1" type="number" value={reviewData.price} onChange={e => setReviewData({...reviewData, price: e.target.value})} placeholder="Value" />
                            <label className={`flex items-center px-3 border rounded cursor-pointer ${reviewData.isChase ? 'bg-yellow-100 border-yellow-400' : ''}`}>
                                <input type="checkbox" checked={reviewData.isChase} onChange={e => setReviewData({...reviewData, isChase: e.target.checked})} className="mr-2" /> Chase
                            </label>
                        </div>
                        <button onClick={handleBroadcast} className="w-full bg-red-600 text-white py-3 rounded font-bold">Broadcast Reveal</button>
                        <button onClick={() => setReviewData(null)} className="w-full mt-2 text-gray-500 text-sm">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};
