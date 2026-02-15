
import { useState } from 'react';
import { User, Group, Thread, Comment } from '../types';
import { INITIAL_GROUPS, INITIAL_THREADS, INITIAL_COMMENTS } from '../constants';

export const useSocialStore = (currentUser: User | null, updateProfile: (updates: Partial<User>) => Promise<void>) => {
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
    const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);

    const getRecommendedGroups = () => {
        const recs: { group: Group, reason: string }[] = [];
        groups.forEach(g => {
            if (currentUser?.interests?.pokemon?.some(p => g.tags.includes(p))) {
                recs.push({ group: g, reason: 'Matches your Pokemon interests' });
            } else if (currentUser?.interests?.sets?.some(s => g.tags.includes(s))) {
                recs.push({ group: g, reason: 'Matches your Set interests' });
            }
        });
        return recs.slice(0, 3);
    };

    const joinGroup = (groupId: string) => {
        if (currentUser) {
            const newGroups = [...(currentUser.joinedGroupIds || []), groupId];
            updateProfile({ joinedGroupIds: newGroups });
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, memberCount: g.memberCount + 1 } : g));
        }
    };

    const leaveGroup = (groupId: string) => {
        if (currentUser) {
            const newGroups = (currentUser.joinedGroupIds || []).filter(id => id !== groupId);
            updateProfile({ joinedGroupIds: newGroups });
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, memberCount: g.memberCount - 1 } : g));
        }
    };

    const createThread = (groupId: string, title: string, body: string) => {
        if (!currentUser) return;
        const thread: Thread = {
            id: `t_${Date.now()}`,
            groupId,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorAvatar: currentUser.avatarUrl,
            title,
            body,
            createdAt: new Date(),
            updatedAt: new Date(),
            upvotes: 0,
            commentCount: 0,
            isPinned: false
        };
        setThreads(prev => [thread, ...prev]);
    };

    const postComment = (threadId: string, body: string) => {
        if (!currentUser) return;
        const comment: Comment = {
            id: `c_${Date.now()}`,
            threadId,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorAvatar: currentUser.avatarUrl,
            body,
            createdAt: new Date(),
            upvotes: 0
        };
        setComments(prev => [...prev, comment]);
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, commentCount: t.commentCount + 1 } : t));
    };

    const getGroupThreads = (groupId: string) => threads.filter(t => t.groupId === groupId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    const getThreadComments = (threadId: string) => comments.filter(c => c.threadId === threadId).sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
        groups,
        threads,
        comments,
        getRecommendedGroups,
        joinGroup,
        leaveGroup,
        createThread,
        postComment,
        getGroupThreads,
        getThreadComments
    };
};
