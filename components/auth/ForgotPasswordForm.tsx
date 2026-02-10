
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordFormProps {
    onSwitchToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSwitchToLogin }) => {
    const { requestPasswordReset, resetPassword } = useAuth();
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMsg(null);
        setIsLoading(true);
        try {
            const res = await requestPasswordReset(email);
            setStatusMsg({ text: res.message, type: 'success' });
            if (res.success) {
                setTimeout(() => setStep(2), 1500);
            }
        } catch (err) {
            setStatusMsg({ text: 'Failed to request code', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMsg(null);
        
        if (newPassword.length < 6) {
            setStatusMsg({ text: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const res = await resetPassword(email, code, newPassword);
            if (res.success) {
                setStatusMsg({ text: res.message, type: 'success' });
                setTimeout(() => onSwitchToLogin(), 2000);
            } else {
                setStatusMsg({ text: res.message, type: 'error' });
            }
        } catch (err) {
            setStatusMsg({ text: 'Failed to reset password', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                <p className="text-sm text-gray-500 mt-1">
                    {step === 1 ? 'Enter your email to receive a reset code' : 'Enter the code and your new password'}
                </p>
            </div>

            {statusMsg && (
                <div className={`mb-4 p-3 rounded-md text-sm border ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {statusMsg.text}
                </div>
            )}

            {step === 1 ? (
                <form onSubmit={handleRequestCode} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input 
                            type="email" 
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-2 border"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="ash@pallet.town"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none disabled:opacity-50"
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Code'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleReset} className="space-y-4">
                    <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 mb-2">
                        Demo Code: <strong>123456</strong>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Verification Code</label>
                        <input 
                            type="text" 
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-2 border"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder="123456"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <input 
                            type="password" 
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-2 border"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none disabled:opacity-50"
                    >
                        {isLoading ? 'Resetting...' : 'Set New Password'}
                    </button>
                </form>
            )}

            <div className="mt-6 text-center text-sm">
                <button 
                    onClick={onSwitchToLogin}
                    className="text-gray-500 hover:text-gray-900 font-medium"
                >
                    Back to Sign In
                </button>
            </div>
        </div>
    );
};
