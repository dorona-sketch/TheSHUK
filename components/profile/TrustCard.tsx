
import React from 'react';
import { User } from '../../types';

interface TrustCardProps {
    user: User;
    trustScore: number;
    salesCount: number;
    rating: number;
}

export const TrustCard: React.FC<TrustCardProps> = ({ user, trustScore, salesCount, rating }) => {
    // Determine Confidence Level
    let confidence = 'Low';
    let colorClass = 'text-gray-600 bg-gray-100';
    
    if (trustScore >= 90) {
        confidence = 'High';
        colorClass = 'text-green-700 bg-green-100 border-green-200';
    } else if (trustScore >= 70) {
        confidence = 'Medium';
        colorClass = 'text-yellow-700 bg-yellow-100 border-yellow-200';
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Trust & Reputation
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${colorClass}`}>
                    {confidence} Confidence
                </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-100">
                <div>
                    <div className="text-2xl font-black text-gray-900">{rating > 0 ? rating.toFixed(1) : '-'}</div>
                    <div className="text-[10px] text-gray-500 font-medium uppercase mt-1">Avg Rating</div>
                </div>
                <div>
                    <div className="text-2xl font-black text-gray-900">{salesCount}</div>
                    <div className="text-[10px] text-gray-500 font-medium uppercase mt-1">Completed Sales</div>
                </div>
                <div>
                    <div className="text-2xl font-black text-gray-900">{trustScore}%</div>
                    <div className="text-[10px] text-gray-500 font-medium uppercase mt-1">Trust Score</div>
                </div>
            </div>
            
            {user.role === 'SELLER' && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                    <span>Seller Verification</span>
                    <span className={user.isVerifiedSeller ? "text-green-600 font-bold" : "text-gray-400"}>
                        {user.isVerifiedSeller ? 'Verified ✓' : 'Unverified'}
                    </span>
                </div>
            )}
        </div>
    );
};
