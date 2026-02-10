
import React, { useState, useEffect } from 'react';

interface EmailVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    onVerify: (code: string) => Promise<{ success: boolean; message: string }>;
    onResend: () => Promise<{ success: boolean; message: string }>;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({ isOpen, onClose, email, onVerify, onResend }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resendStatus, setResendStatus] = useState('');
    const [countdown, setCountdown] = useState(0);

    // Focus and reset
    useEffect(() => {
        if (isOpen) {
            setCode('');
            setError('');
            setResendStatus('');
            setCountdown(0);
        }
    }, [isOpen]);

    // Countdown logic
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6) {
            setError('Code must be 6 digits');
            return;
        }
        
        setIsSubmitting(true);
        setError('');
        try {
            const res = await onVerify(code);
            if (!res.success) {
                setError(res.message);
                setIsSubmitting(false);
            } else {
                // Success is handled by parent closing modal
            }
        } catch (e) {
            setError("Verification failed");
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        
        setResendStatus('Sending...');
        try {
            const res = await onResend();
            if (res.success) {
                setResendStatus('Sent!');
                setCountdown(60); // 60s cooldown
            } else {
                setResendStatus('Failed');
            }
        } catch (e) {
            setResendStatus('Error');
        }
        
        // Clear status msg after 3s
        setTimeout(() => {
            if (resendStatus !== 'Sent!') setResendStatus('');
        }, 3000);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm" onClick={onClose}></div>
                
                <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in-up">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Verify your Email</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            We sent a verification code to <br/><strong>{email}</strong>
                        </p>
                        <p className="text-xs text-blue-600 mt-2 bg-blue-50 py-1 px-2 rounded inline-block">
                            Check console for code (Dev Mode)
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <input 
                                type="text"
                                value={code}
                                onChange={e => {
                                    // Allow only numbers and max 6 chars
                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                    setCode(val);
                                }}
                                className="w-full text-center text-2xl tracking-[0.5em] font-bold border-gray-300 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="000000"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="mb-4 text-center text-sm text-red-600 font-medium bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isSubmitting || code.length < 6}
                            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-sm transition-colors mb-4"
                        >
                            {isSubmitting ? 'Verifying...' : 'Verify Code'}
                        </button>
                    </form>

                    <div className="text-center">
                        <button 
                            onClick={handleResend}
                            disabled={countdown > 0}
                            className={`text-sm font-medium ${countdown > 0 ? 'text-gray-400' : 'text-primary-600 hover:underline'}`}
                        >
                            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
                        </button>
                        {resendStatus && <div className="text-xs text-green-600 mt-1">{resendStatus}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
