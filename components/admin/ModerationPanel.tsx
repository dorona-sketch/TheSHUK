
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { User, Report } from '../../types';
import { formatSmartDate } from '../../utils/dateUtils';

export const ModerationPanel: React.FC = () => {
    const { reports, dismissReport, resolveReport } = useStore();
    const { getAllUsers, suspendUser, unsuspendUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'REPORTS' | 'USERS'>('REPORTS');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'USERS') {
            loadUsers();
        }
    }, [activeTab]);

    const loadUsers = async () => {
        setLoading(true);
        const users = await getAllUsers();
        setAllUsers(users);
        setLoading(false);
    };

    const handleSuspend = async (userId: string) => {
        const reason = prompt("Enter suspension reason:", "Violation of Terms");
        if (!reason) return;
        
        const daysStr = prompt("Suspension duration (days):", "7");
        if (!daysStr) return;
        const days = parseInt(daysStr);
        if (isNaN(days)) return alert("Invalid duration");

        const until = new Date();
        until.setDate(until.getDate() + days);

        const res = await suspendUser(userId, reason, until);
        alert(res.message);
        loadUsers(); // Refresh
        
        // Also resolve associated reports if any
        reports.forEach(r => {
            if (r.reportedEntityId === userId) resolveReport(r.id);
        });
    };

    const handleUnsuspend = async (userId: string) => {
        if (confirm("Revoke suspension for this user?")) {
            const res = await unsuspendUser(userId);
            alert(res.message);
            loadUsers();
        }
    };

    const suspendedUsers = allUsers.filter(u => u.suspensionUntil && new Date(u.suspensionUntil) > new Date());

    return (
        <div className="space-y-6 animate-fade-in-up pb-12">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Moderation Console</h1>
                    <p className="text-gray-500">Manage reported content and user access.</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-1 flex gap-1">
                    <button 
                        onClick={() => setActiveTab('REPORTS')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'REPORTS' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Pending Reports ({reports.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('USERS')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'USERS' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Suspended Users
                    </button>
                </div>
            </div>

            {activeTab === 'REPORTS' && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {reports.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="text-4xl mb-2">🎉</div>
                            <p className="font-medium">All caught up! No pending reports.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {reports.map(report => (
                                <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                report.entityType === 'USER' ? 'bg-orange-100 text-orange-800' :
                                                report.entityType === 'LISTING' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {report.entityType}
                                            </span>
                                            <span className="text-sm text-gray-500 font-mono">{report.reportedEntityId}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">{formatSmartDate(report.createdAt)}</span>
                                    </div>
                                    
                                    <h3 className="font-bold text-gray-900 mb-2">Reason: "{report.reason}"</h3>
                                    <p className="text-sm text-gray-600 mb-4">Reported by: <span className="font-medium">{report.reporterName}</span></p>
                                    
                                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                                        <button 
                                            onClick={() => dismissReport(report.id)}
                                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-xs transition-colors"
                                        >
                                            Dismiss Report
                                        </button>
                                        {report.entityType === 'USER' && (
                                            <button 
                                                onClick={() => handleSuspend(report.reportedEntityId)}
                                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-xs transition-colors shadow-sm"
                                            >
                                                Suspend User
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => resolveReport(report.id)}
                                            className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-xs transition-colors shadow-sm ml-auto"
                                        >
                                            Resolve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'USERS' && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Loading users...</div>
                    ) : suspendedUsers.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="text-4xl mb-2">✅</div>
                            <p className="font-medium">No users currently suspended.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expires</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {suspendedUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img className="h-8 w-8 rounded-full" src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt="" />
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                            {user.suspensionReason}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatSmartDate(user.suspensionUntil)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => handleUnsuspend(user.id)}
                                                className="text-green-600 hover:text-green-900 font-bold hover:underline"
                                            >
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};
