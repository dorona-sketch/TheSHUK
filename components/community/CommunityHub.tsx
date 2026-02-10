
import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Group } from '../../types';

interface CommunityHubProps {
    onNavigateGroup: (groupId: string) => void;
}

const GroupCard: React.FC<{ group: Group, onClick: () => void, recommendationReason?: string }> = ({ group, onClick, recommendationReason }) => (
    <div 
        onClick={onClick}
        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
    >
        {recommendationReason && (
            <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                {recommendationReason}
            </div>
        )}
        <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-2xl border border-primary-100">
                {group.icon || '👥'}
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{group.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                    {group.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">#{tag}</span>
                    ))}
                </div>
            </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
            <span>{group.memberCount} members</span>
            <span className="font-medium text-primary-600 group-hover:underline">Visit Group &rarr;</span>
        </div>
    </div>
);

export const CommunityHub: React.FC<CommunityHubProps> = ({ onNavigateGroup }) => {
    const { groups, getRecommendedGroups, currentUser } = useStore();
    const recommendations = getRecommendedGroups();
    
    // Fallback: Just show all groups if no specific recommendations or user not logged in
    const allGroups = groups;
    const yourGroups = groups.filter(g => currentUser?.joinedGroupIds?.includes(g.id));

    return (
        <div className="space-y-8 pb-12 animate-fade-in-up">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold text-gray-900">Community Hub</h1>
                <p className="text-gray-500">Connect with other collectors based on what you love.</p>
            </div>

            {/* Recommendations Section */}
            {currentUser && recommendations.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="bg-yellow-400 w-2 h-2 rounded-full"></span>
                        Recommended For You
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recommendations.map(rec => (
                            <GroupCard 
                                key={rec.group.id} 
                                group={rec.group} 
                                onClick={() => onNavigateGroup(rec.group.id)} 
                                recommendationReason={rec.reason}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Your Groups */}
            {currentUser && yourGroups.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Your Groups</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {yourGroups.map(group => (
                            <GroupCard 
                                key={group.id} 
                                group={group} 
                                onClick={() => onNavigateGroup(group.id)} 
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Browse All */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Browse All Communities</h2>
                    <button className="text-xs font-bold text-primary-600 hover:underline">View Categories</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allGroups.map(group => (
                        <GroupCard 
                            key={group.id} 
                            group={group} 
                            onClick={() => onNavigateGroup(group.id)} 
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};
