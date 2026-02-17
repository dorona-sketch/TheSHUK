import React, { useRef, useState } from 'react';

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

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const handlePointerDown = (idx: number, e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingIdx(idx);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const updatePointFromPointer = (clientX: number, clientY: number) => {
        if (draggingIdx === null || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clamp((clientX - rect.left) / rect.width, 0.02, 0.98);
        const y = clamp((clientY - rect.top) / rect.height, 0.02, 0.98);

        setPoints(prev => {
            const next = [...prev];
            next[draggingIdx] = { x, y };
            return next;
        });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (draggingIdx === null) return;
        e.preventDefault();
        updatePointFromPointer(e.clientX, e.clientY);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (draggingIdx !== null && (e.target as Element).hasPointerCapture?.(e.pointerId)) {
            (e.target as Element).releasePointerCapture(e.pointerId);
        }
        setDraggingIdx(null);
    };

    const polyPoints = points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');

    return (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col safe-area-pt safe-area-pb">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-900 text-white border-b border-gray-700">
                <button onClick={onCancel} className="text-gray-300 font-medium min-h-[44px] px-2">Cancel</button>
                <span className="font-bold">Adjust Corners</span>
                <button
                    onClick={() => onComplete(points)}
                    className="bg-primary-600 px-5 min-h-[44px] rounded-full font-bold"
                >
                    Done
                </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-gray-900">
                <div
                    ref={containerRef}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="relative w-full max-w-full max-h-full aspect-[3/4] select-none touch-none"
                >
                    <img src={imageSrc} className="w-full h-full object-contain pointer-events-none" alt="Crop target" />

                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon points={polyPoints} fill="rgba(255, 255, 255, 0.15)" stroke="#3b82f6" strokeWidth="0.8" />
                        <line x1={points[0].x*100} y1={points[0].y*100} x2={points[1].x*100} y2={points[1].y*100} stroke="#3b82f6" strokeWidth="0.8" />
                        <line x1={points[1].x*100} y1={points[1].y*100} x2={points[2].x*100} y2={points[2].y*100} stroke="#3b82f6" strokeWidth="0.8" />
                        <line x1={points[2].x*100} y1={points[2].y*100} x2={points[3].x*100} y2={points[3].y*100} stroke="#3b82f6" strokeWidth="0.8" />
                        <line x1={points[3].x*100} y1={points[3].y*100} x2={points[0].x*100} y2={points[0].y*100} stroke="#3b82f6" strokeWidth="0.8" />
                    </svg>

                    {points.map((p, i) => (
                        <button
                            key={i}
                            type="button"
                            onPointerDown={(e) => handlePointerDown(i, e)}
                            className="absolute w-11 h-11 -ml-[22px] -mt-[22px] flex items-center justify-center cursor-grab active:cursor-grabbing z-10 touch-none pointer-events-auto"
                            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                            aria-label={`Move corner ${i + 1}`}
                        >
                            <span className="w-7 h-7 bg-white border-[3px] border-primary-600 rounded-full shadow-xl" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 text-center text-gray-400 text-sm bg-gray-900 border-t border-gray-700">
                Drag the corners to match the card boundaries.
            </div>
        </div>
    );
};
