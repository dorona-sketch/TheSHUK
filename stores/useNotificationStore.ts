
import { useState } from 'react';
import { User, Notification, Report } from '../types';
import { MOCK_REPORTS } from '../constants';

export const useNotificationStore = (currentUser: User | null) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);

    const markNotificationRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const markAllNotificationsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const submitReport = (entityId: string, type: 'USER' | 'LISTING' | 'THREAD' | 'COMMENT', reason: string) => {
        if (!currentUser) return;
        const report: Report = {
            id: `r_${Date.now()}`,
            reporterId: currentUser.id,
            reporterName: currentUser.name,
            reportedEntityId: entityId,
            entityType: type,
            reason,
            status: 'PENDING',
            createdAt: new Date()
        };
        setReports(prev => [report, ...prev]);
    };

    const dismissReport = (reportId: string) => {
        setReports(prev => prev.filter(r => r.id !== reportId));
    };

    const resolveReport = (reportId: string) => {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'RESOLVED' } : r));
    };

    return {
        notifications,
        setNotifications,
        reports,
        markNotificationRead,
        markAllNotificationsRead,
        submitReport,
        dismissReport,
        resolveReport
    };
};
