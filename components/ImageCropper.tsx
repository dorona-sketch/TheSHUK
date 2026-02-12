
import React, { useRef, useState, useEffect } from 'react';

interface ImageCropperProps {
    imageSrc: string;
    onComplete: (points: {x: number, y: number}[]) => void;
    onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onComplete, onCancel }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [points, setPoints] = useState([
        { x: 0.1, y: 0.1 }, // TL
        { x: 0.9, y: 0.1 }, // TR
        { x: 0.9, y: 0.9 }, // BR
        { x: 0.1, y: 0.9 }  // BL
    ]);
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

    const handlePointerDown = (idx: number, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingIdx(idx);
        (e.target as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (draggingIdx === null || !containerRef.current) return;
        e.preventDefault();
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        
        setPoints(prev => {
            const next = [...prev];
            next[draggingIdx] = { x, y };
            return next;
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setDraggingIdx(null);
        (e.target as Element).releasePointerCapture(e.pointerId);
    };

    // SVG Polygon points string
    const polyPoints = points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');

    return (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col">
            <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
                <button onClick={onCancel} className="text-gray-300 font-medium">Cancel</button>
                <span className="font-bold">Adjust Corners</span>
                <button 
                    onClick={() => onComplete(points)} 
                    className="bg-primary-600 px-4 py-1.5 rounded-full font-bold"
                >
                    Done
                </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-gray-900">
                <div 
                    ref={containerRef} 
                    className="relative max-w-full max-h-full aspect-[3/4] select-none touch-none"
                >
                    <img src={imageSrc} className="w-full h-full object-contain pointer-events-none" />
                    
                    {/* SVG Overlay for Crop Area */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon points={polyPoints} fill="rgba(255, 255, 255, 0.2)" stroke="#fff" strokeWidth="0.5" />
                        {/* Connecting Lines */}
                        <line x1={points[0].x*100} y1={points[0].y*100} x2={points[1].x*100} y2={points[1].y*100} stroke="#3b82f6" strokeWidth="0.8" />
                        <line x1={points[1].x*100} y1={points[1].y*100} x2={points[2].x*100} y2={points[2].y*100} stroke="#3b82f6" strokeWidth="0.8" />
                        <line x1={points[2].x*100} y1={points[2].y*100} x2={points[3].x*100} y2={points[3].y*100} stroke="#3b82f6" strokeWidth="0.8" />
                        <line x1={points[3].x*100} y1={points[3].y*100} x2={points[0].x*100} y2={points[0].y*100} stroke="#3b82f6" strokeWidth="0.8" />
                    </svg>

                    {/* Draggable Handles */}
                    {points.map((p, i) => (
                        <div
                            key={i}
                            onPointerDown={(e) => handlePointerDown(i, e)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-move z-10 touch-none pointer-events-auto"
                            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                        >
                            <div className="w-6 h-6 bg-white border-2 border-primary-600 rounded-full shadow-lg"></div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="p-4 text-center text-gray-400 text-xs bg-gray-900">
                Drag the corners to match the card boundaries.
            </div>
        </div>
    );
};
