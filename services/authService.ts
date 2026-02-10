
import { User, AppMode } from '../types';
import { MOCK_USER_BUYER, MOCK_USER_SELLER, SECONDARY_SELLER } from '../constants';

interface UserDB extends User {
    passwordHash: string;
}

interface AuthResponse {
    user: User;
    token: string;
}

// Versioned keys to ensure clean state with new hashing algorithm
const DB_KEY = 'pokevault_users_db_v2';
const SESSION_KEY = 'pokevault_session_v2';
const VERIFICATION_TOKENS_KEY = 'pokevault_verification_tokens';

// Secure hashing using Web Crypto API (SHA-256) with fallback
const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "_pokevault_secure_salt_2024");
    
    // Safety check for crypto availability
    const cryptoApi = typeof window !== 'undefined' && window.crypto ? window.crypto : (typeof crypto !== 'undefined' ? crypto : null);

    if (cryptoApi && cryptoApi.subtle) {
        try {
            const hashBuffer = await cryptoApi.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn("Crypto digest failed, falling back", e);
        }
    }
    
    // Insecure Fallback for environments without Web Crypto (e.g. some older builds)
    // In a real app, this would block login, but for MVP we allow it
    return btoa(password + "_insecure_fallback");
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    const computed = await hashPassword(password);
    return computed === hash;
};

const initDB = async () => {
    if (typeof window === 'undefined') return;
    
    const existing = localStorage.getItem(DB_KEY);
    if (!existing) {
        // Create initial seed users with secure hashes
        const defaultPasswordHash = await hashPassword('password123');
        
        const initialUsers: UserDB[] = [
            { ...MOCK_USER_BUYER, passwordHash: defaultPasswordHash, preferredAppMode: AppMode.COMBINED, isEmailVerified: true },
            { ...MOCK_USER_SELLER, passwordHash: defaultPasswordHash, preferredAppMode: AppMode.COMBINED, isEmailVerified: true },
            { ...SECONDARY_SELLER, passwordHash: defaultPasswordHash, preferredAppMode: AppMode.MARKETPLACE, isEmailVerified: true }
        ];
        
        localStorage.setItem(DB_KEY, JSON.stringify(initialUsers));
        console.debug('Auth DB initialized with secure seed data.');
    }
};

const getUsers = (): UserDB[] => {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
};

const saveUser = (user: UserDB) => {
    const users = getUsers();
    users.push(user);
    localStorage.setItem(DB_KEY, JSON.stringify(users));
};

const updateUserInDB = (updatedUser: User) => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        // Preserve password hash when updating profile details
        const currentDBUser = users[index];
        users[index] = { ...currentDBUser, ...updatedUser }; 
        localStorage.setItem(DB_KEY, JSON.stringify(users));
    }
};

// --- Token Management Helpers ---
const getTokens = (): Record<string, string> => {
    const data = localStorage.getItem(VERIFICATION_TOKENS_KEY);
    return data ? JSON.parse(data) : {};
};

const saveToken = (userId: string, token: string) => {
    const tokens = getTokens();
    tokens[userId] = token;
    localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(tokens));
};

const verifyToken = (userId: string, token: string): boolean => {
    const tokens = getTokens();
    const valid = tokens[userId] === token;
    if (valid) {
        delete tokens[userId]; // Consume token on success
        localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(tokens));
    }
    return valid;
};

export const authService = {
    init: initDB,

    async login(email: string, password: string): Promise<AuthResponse> {
        // Simulate network latency
        await new Promise(r => setTimeout(r, 400));

        const users = getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            throw new Error("Invalid email or password");
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            throw new Error("Invalid email or password");
        }

        // Generate a session token
        const token = `jwt_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2)}`;
        
        // Remove sensitive data before returning/storing in session
        // @ts-ignore
        const { passwordHash, ...safeUser } = user;
        
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: safeUser, token }));
        
        return { user: safeUser, token };
    },

    async register(name: string, email: string, password: string, role: 'BUYER' | 'SELLER' = 'BUYER'): Promise<AuthResponse> {
        // Simulate network latency
        await new Promise(r => setTimeout(r, 500));

        const users = getUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error("Email already registered");
        }

        const secureHash = await hashPassword(password);
        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
        const coverImageUrl = 'https://images.unsplash.com/photo-1620503374956-c942862f0372?auto=format&fit=crop&q=80&w=2000';

        const newUser: UserDB = {
            id: `u_${Math.random().toString(36).substr(2, 9)}`,
            name,
            displayName: name, // Default display name same as name
            email,
            role,
            walletBalance: 1000, // Sign-up bonus
            joinedAt: new Date(),
            passwordHash: secureHash,
            avatarUrl,
            avatar: avatarUrl, // Backwards compat
            location: 'Unknown',
            bio: 'New member',
            preferredAppMode: AppMode.COMBINED,
            coverImageUrl,
            coverImage: coverImageUrl, // Backwards compat
            isEmailVerified: false // Default to unverified
        };

        saveUser(newUser);

        const token = `jwt_${newUser.id}_${Date.now()}`;
        // @ts-ignore
        const { passwordHash, ...safeUser } = newUser;

        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: safeUser, token }));

        return { user: safeUser, token };
    },

    async logout(): Promise<void> {
        await new Promise(r => setTimeout(r, 100));
        localStorage.removeItem(SESSION_KEY);
    },

    async getSession(): Promise<User | null> {
        const sessionStr = localStorage.getItem(SESSION_KEY);
        if (!sessionStr) return null;

        try {
            const { user } = JSON.parse(sessionStr);
            // Refresh data from DB to get latest status (e.g. verified)
            const users = getUsers();
            const freshUser = users.find(u => u.id === user.id);
            if (freshUser) {
                // @ts-ignore
                const { passwordHash, ...safeUser } = freshUser;
                return safeUser;
            }
            return user;
        } catch {
            return null;
        }
    },

    async updateProfile(user: User, updates: Partial<User>): Promise<User> {
        await new Promise(r => setTimeout(r, 300));

        const updatedUser = { ...user, ...updates };
        updateUserInDB(updatedUser);
        
        // Update current session
        const sessionStr = localStorage.getItem(SESSION_KEY);
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            session.user = updatedUser;
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }

        return updatedUser;
    },

    // --- Trust & Verification Features ---

    async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
        await new Promise(r => setTimeout(r, 600));
        const users = getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
            // Return success even if not found for security (blind)
            return { success: true, message: 'If an account exists, a code has been sent.' };
        }
        
        // In a real app, store a reset token in DB. Here we simulate.
        console.log(`[Mock Auth] Password reset requested for ${email}. Mock code: 123456`);
        return { success: true, message: 'Reset code sent to your email.' };
    },

    async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        await new Promise(r => setTimeout(r, 800));
        
        // Verify mock code
        if (code !== '123456') {
            return { success: false, message: 'Invalid verification code.' };
        }

        const users = getUsers();
        const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (idx === -1) return { success: false, message: 'Account not found.' };

        const newHash = await hashPassword(newPassword);
        users[idx].passwordHash = newHash;
        localStorage.setItem(DB_KEY, JSON.stringify(users));

        return { success: true, message: 'Password updated successfully. Please login.' };
    },

    /**
     * Generates a random 6-digit code, stores it, and simulates email sending via console.
     */
    async sendVerificationCode(email: string, userId: string): Promise<{ success: boolean; message: string }> {
        await new Promise(r => setTimeout(r, 800)); // Simulate sending delay
        
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
        saveToken(userId, code);
        
        // Simulate email service
        console.group('📧 Email Service Simulation');
        console.log(`To: ${email}`);
        console.log(`Subject: Verify your PokeVault account`);
        console.log(`Body: Your verification code is: ${code}`);
        console.groupEnd();

        return { success: true, message: 'Verification code sent to your email.' };
    },

    /**
     * Verifies the stored token for the user.
     */
    async verifyEmailToken(userId: string, code: string): Promise<{ success: boolean; message: string }> {
        await new Promise(r => setTimeout(r, 600)); // Simulate verification delay
        const isValid = verifyToken(userId, code);
        
        if (isValid) {
            const users = getUsers();
            const idx = users.findIndex(u => u.id === userId);
            if (idx !== -1) {
                users[idx].isEmailVerified = true;
                localStorage.setItem(DB_KEY, JSON.stringify(users));
                return { success: true, message: 'Email verified successfully!' };
            }
            return { success: false, message: 'User not found.' };
        }
        return { success: false, message: 'Invalid verification code.' };
    }
};
