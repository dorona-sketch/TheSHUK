
import { User } from '../types';
import { MOCK_USER_BUYER, MOCK_USER_SELLER, SECONDARY_SELLER } from '../constants';

const DB_KEY = 'pokevault_users';
const SESS_KEY = 'pokevault_session';

const getUsers = (): User[] => {
    if (typeof window === 'undefined') return [MOCK_USER_BUYER, MOCK_USER_SELLER, SECONDARY_SELLER];
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [MOCK_USER_BUYER, MOCK_USER_SELLER, SECONDARY_SELLER];
};

const saveUsers = (users: User[]) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(DB_KEY, JSON.stringify(users));
    }
};

export const authService = {
    async init() {
        if (typeof window !== 'undefined' && !localStorage.getItem(DB_KEY)) {
            saveUsers([MOCK_USER_BUYER, MOCK_USER_SELLER, SECONDARY_SELLER]);
        }
    },

    async getSession(): Promise<User | null> {
        if (typeof window === 'undefined') return null;
        const sessId = localStorage.getItem(SESS_KEY);
        if (!sessId) return null;
        const users = getUsers();
        return users.find(u => u.id === sessId) || null;
    },

    async login(email: string, password: string): Promise<{ user: User }> {
        await new Promise(r => setTimeout(r, 500));
        const users = getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) throw new Error("Invalid credentials");
        // Mock password check (allow any password > 6 chars if user exists)
        if (password.length < 6) throw new Error("Invalid credentials");

        if (user.suspensionUntil && new Date(user.suspensionUntil) > new Date()) {
            throw new Error(`Account suspended until ${new Date(user.suspensionUntil).toLocaleDateString()}: ${user.suspensionReason}`);
        }

        localStorage.setItem(SESS_KEY, user.id);
        return { user };
    },

    async register(name: string, email: string, password: string, role: 'BUYER' | 'SELLER'): Promise<{ user: User }> {
        await new Promise(r => setTimeout(r, 800));
        const users = getUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error("Email already registered");
        }

        const newUser: User = {
            id: `u_${Date.now()}`,
            name,
            email,
            role,
            walletBalance: role === 'SELLER' ? 0 : 1000, // Sign up bonus
            joinedAt: new Date(),
            isEmailVerified: false,
            // Init onboarding
            onboarding: role === 'SELLER' ? { seller: { step: 0, skipped: false } } : { buyer: { step: 0, skipped: false } }
        };

        users.push(newUser);
        saveUsers(users);
        localStorage.setItem(SESS_KEY, newUser.id);
        return { user: newUser };
    },

    async logout() {
        localStorage.removeItem(SESS_KEY);
    },

    async updateProfile(user: User, updates: Partial<User>): Promise<User> {
        await new Promise(r => setTimeout(r, 300));
        const users = getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx === -1) throw new Error("User not found");

        const updated = { ...users[idx], ...updates };
        users[idx] = updated;
        saveUsers(users);
        return updated;
    },

    async requestPasswordReset(email: string) {
        await new Promise(r => setTimeout(r, 500));
        const users = getUsers();
        if (!users.find(u => u.email === email)) throw new Error("User not found");
        return { success: true, message: "Reset code sent to email" };
    },

    async resetPassword(email: string, code: string, newPass: string) {
        await new Promise(r => setTimeout(r, 800));
        // Mock verification
        if (code !== '123456') return { success: false, message: "Invalid code" };
        return { success: true, message: "Password updated" };
    },

    async sendVerificationCode(email: string, userId: string) {
        await new Promise(r => setTimeout(r, 600));
        return { success: true, message: "Verification code sent" };
    },

    async verifyEmailToken(userId: string, code: string) {
        await new Promise(r => setTimeout(r, 600));
        // Mock check (in real app, check DB)
        // For dev, accept any 6 digit code or specifically '000000'
        return { success: true, message: "Email verified successfully" };
    },

    async getAllUsers(): Promise<User[]> {
        await new Promise(r => setTimeout(r, 300));
        return getUsers();
    },

    async suspendUser(userId: string, reason: string, until: Date): Promise<{ success: boolean; message: string }> {
        await new Promise(r => setTimeout(r, 400));
        const users = getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            users[idx].suspensionReason = reason;
            users[idx].suspensionUntil = until;
            saveUsers(users);
            return { success: true, message: 'User suspended.' };
        }
        return { success: false, message: 'User not found.' };
    },

    async unsuspendUser(userId: string): Promise<{ success: boolean; message: string }> {
        await new Promise(r => setTimeout(r, 400));
        const users = getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            delete users[idx].suspensionReason;
            delete users[idx].suspensionUntil;
            saveUsers(users);
            return { success: true, message: 'Suspension revoked.' };
        }
        return { success: false, message: 'User not found.' };
    },

    async verifySeller(userId: string): Promise<{ success: boolean; message: string }> {
        await new Promise(r => setTimeout(r, 400));
        const users = getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            users[idx].isVerifiedSeller = true;
            saveUsers(users);
            return { success: true, message: 'Seller verified successfully.' };
        }
        return { success: false, message: 'User not found.' };
    }
};
