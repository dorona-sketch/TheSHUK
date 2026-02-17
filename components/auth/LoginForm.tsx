
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
    onSuccess: () => void;
    onSwitchToRegister: () => void;
    onForgotPassword?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister, onForgotPassword }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await login(email, password);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                <p className="text-sm text-gray-500 mt-1">Sign in to your Break-Hit account</p>
                <div className="mt-2 text-xs bg-blue-50 text-blue-700 p-2 rounded">
                    Demo credentials: <strong>ash@pallet.town</strong> / <strong>password123</strong>
                </div>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        {onForgotPassword && (
                            <button 
                                type="button"
                                onClick={onForgotPassword}
                                className="text-xs text-primary-600 hover:text-primary-700"
                            >
                                Forgot password?
                            </button>
                        )}
                    </div>
                    <input 
                        type="password" 
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-2 border"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                <span className="text-gray-500">Don't have an account? </span>
                <button 
                    onClick={onSwitchToRegister}
                    className="font-medium text-primary-600 hover:text-primary-500"
                >
                    Register now
                </button>
            </div>
        </div>
    );
};
