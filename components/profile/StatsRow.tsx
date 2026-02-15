
import React from 'react';

interface StatsRowProps {
    stats: {
        listings: number;
        bids: number;
        breaks: number;
    }
}

export const StatsRow: React.FC<StatsRowProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
                <div className="text-lg font-bold text-gray-900">{stats.bids}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">Bids / Wins</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
                <div className="text-lg font-bold text-gray-900">{stats.listings}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">Listings</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
                <div className="text-lg font-bold text-gray-900">{stats.breaks}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">Breaks</div>
            </div>
        </div>
    );
};
