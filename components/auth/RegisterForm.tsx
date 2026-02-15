
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface RegisterFormProps {
    onSuccess: () => void;
    onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
    const { register, socialLogin } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            await register(name, email, password, role);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSocialLogin = async (provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK') => {
        setError('');
        setSocialLoading(provider);
        try {
            await socialLogin(provider);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Social login failed');
        } finally {
            setSocialLoading(null);
        }
    };

    return (
        <div className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
             <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                <p className="text-sm text-gray-500 mt-1">Join the marketplace today</p>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
                    {error}
                </div>
            )}

            <div className="space-y-3 mb-6">
                <button
                    type="button"
                    onClick={() => handleSocialLogin('GOOGLE')}
                    disabled={!!socialLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 transition-colors disabled:opacity-50"
                >
                    {socialLoading === 'GOOGLE' ? (
                        <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    )}
                    Continue with Google
                </button>

                <button
                    type="button"
                    onClick={() => handleSocialLogin('APPLE')}
                    disabled={!!socialLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-black text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 transition-colors disabled:opacity-50"
                >
                    {socialLoading === 'APPLE' ? (
                        <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.37-1.62 1.37.08 2.58.59 3.4 1.7-.1.05-2.04 1.18-2.04 3.5 0 2.75 2.45 3.73 2.53 3.78-.05.14-.37 1.18-.81 2.17-.67 1.48-1.41 2.37-2.53 2.7zm-2.8-14.9c1.4-1.68 1.15-3.77 1.15-3.77-.14.05-1.7.35-2.8 1.63-.95 1.1-1.33 2.8-1.33 2.8s1.63.15 2.98-.66z" />
                        </svg>
                    )}
                    Continue with Apple
                </button>

                <button
                    type="button"
                    onClick={() => handleSocialLogin('FACEBOOK')}
                    disabled={!!socialLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-transparent rounded-lg shadow-sm bg-[#1877F2] text-sm font-medium text-white hover:bg-[#1560c4] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                    {socialLoading === 'FACEBOOK' ? (
                        <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                    )}
                    Continue with Facebook
                </button>
            </div>

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or register with email</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">I want to...</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div 
                            onClick={() => setRole('BUYER')}
                            className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${role === 'BUYER' ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <div className={`text-2xl mb-1 ${role === 'BUYER' ? 'grayscale-0' : 'grayscale'}`}>🛍️</div>
                            <div className={`font-bold text-sm ${role === 'BUYER' ? 'text-primary-900' : 'text-gray-900'}`}>Buyer</div>
                            <div className="text-[10px] text-gray-500 leading-tight mt-1">Collect & Bid</div>
                        </div>
                        <div 
                            onClick={() => setRole('SELLER')}
                            className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${role === 'SELLER' ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <div className={`text-2xl mb-1 ${role === 'SELLER' ? 'grayscale-0' : 'grayscale'}`}>💼</div>
                            <div className={`font-bold text-sm ${role === 'SELLER' ? 'text-orange-900' : 'text-gray-900'}`}>Seller</div>
                            <div className="text-[10px] text-gray-500 leading-tight mt-1">List & Break</div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input 
                        type="text" 
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-2 border"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input 
                        type="email" 
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-2 border"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input 
                        type="password" 
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-2 border"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input 
                        type="password" 
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-2 border"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                <span className="text-gray-500">Already have an account? </span>
                <button 
                    onClick={onSwitchToLogin}
                    className="font-medium text-primary-600 hover:text-primary-500"
                >
                    Sign in
                </button>
            </div>
        </div>
    );
};
