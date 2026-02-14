
import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'BUYER' | 'SELLER') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean, message: string }>;
  resetPassword: (email: string, code: string, newPass: string) => Promise<{ success: boolean, message: string }>;
  initiateEmailVerification: () => Promise<{ success: boolean, message: string }>;
  completeEmailVerification: (code: string) => Promise<{ success: boolean, message: string }>;
  getAllUsers: () => Promise<User[]>;
  suspendUser: (userId: string, reason: string, until: Date) => Promise<{ success: boolean; message: string }>;
  unsuspendUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  verifySeller: (userId: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
        await authService.init(); // Seed DB if needed
        const sessionUser = await authService.getSession();
        setUser(sessionUser);
        setLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
  };

  const register = async (name: string, email: string, password: string, role: 'BUYER' | 'SELLER' = 'BUYER') => {
    const response = await authService.register(name, email, password, role);
    setUser(response.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
      if (!user) return;
      const updated = await authService.updateProfile(user, updates);
      setUser(updated);
  };

  const requestPasswordReset = async (email: string) => {
      return await authService.requestPasswordReset(email);
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
      return await authService.resetPassword(email, code, newPassword);
  };

  const initiateEmailVerification = async () => {
      if (!user) return { success: false, message: 'User not found' };
      return await authService.sendVerificationCode(user.email, user.id);
  };

  const completeEmailVerification = async (code: string) => {
      if (!user) return { success: false, message: 'User not found' };
      const res = await authService.verifyEmailToken(user.id, code);
      if (res.success) {
          // Refresh user state
          setUser({ ...user, isEmailVerified: true });
          // Also update session in background
          await authService.updateProfile(user, { isEmailVerified: true });
      }
      return res;
  };

  // --- Admin Methods ---
  const getAllUsers = async () => {
      return await authService.getAllUsers();
  };

  const suspendUser = async (userId: string, reason: string, until: Date) => {
      return await authService.suspendUser(userId, reason, until);
  };

  const unsuspendUser = async (userId: string) => {
      return await authService.unsuspendUser(userId);
  };

  const verifySeller = async (userId: string) => {
      return await authService.verifySeller(userId);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        login, 
        register, 
        logout, 
        updateProfile, 
        requestPasswordReset, 
        resetPassword, 
        initiateEmailVerification, 
        completeEmailVerification,
        getAllUsers,
        suspendUser,
        unsuspendUser,
        verifySeller
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
