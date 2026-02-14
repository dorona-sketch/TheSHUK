
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';

interface OnboardingFlowProps {
    steps: React.ReactNode[];
    role: 'BUYER' | 'SELLER';
    onComplete: () => void;
    onSkip: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ steps, role, onComplete, onSkip }) => {
    const { user, updateProfile } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);

    // Initialize step from user profile
    useEffect(() => {
        if (user?.onboarding) {
            const state = role === 'BUYER' ? user.onboarding.buyer : user.onboarding.seller;
            if (state && !state.completedAt && !state.skipped) {
                // Ensure valid step index
                if (state.step < steps.length) {
                    setCurrentStep(state.step);
                }
            }
        }
    }, [user?.onboarding, role, steps.length]);

    const handleNext = async () => {
        if (currentStep < steps.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            // Persist progress
            await saveProgress(nextStep);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleFinish = async () => {
        setShowConfetti(true);
        // Persist completion
        await saveProgress(steps.length, true); // Mark as completed
        
        setTimeout(() => {
            onComplete();
        }, 1500); // Wait for confetti
    };

    const saveProgress = async (step: number, completed = false) => {
        if (!user) return;
        const currentOnboarding = user.onboarding || {};
        const key = role === 'BUYER' ? 'buyer' : 'seller';
        
        await updateProfile({
            onboarding: {
                ...currentOnboarding,
                [key]: {
                    step,
                    completedAt: completed ? new Date() : undefined,
                    skipped: false
                }
            }
        });
    };

    const handleSkipAction = async () => {
        if (confirm("Skip onboarding? You can always find this in settings.")) {
            if (!user) return onSkip();
            
            const currentOnboarding = user.onboarding || {};
            const key = role === 'BUYER' ? 'buyer' : 'seller';
            
            await updateProfile({
                onboarding: {
                    ...currentOnboarding,
                    [key]: {
                        step: currentStep,
                        completedAt: undefined,
                        skipped: true
                    }
                }
            });
            onSkip();
        }
    };

    // Calculate progress percentage
    const progress = ((currentStep + 1) / steps.length) * 100;

    return (
        <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-hidden">
            {/* Confetti (Simple CSS implementation) */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div 
                            key={i} 
                            className="absolute w-3 h-3 rounded-full animate-bounce-short"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                backgroundColor: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'][Math.floor(Math.random() * 5)],
                                animationDuration: `${1 + Math.random()}s`,
                                animationDelay: `${Math.random() * 0.5}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Header */}
            <div className="bg-white px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl">
                        {role === 'BUYER' ? '🛍️' : '💼'}
                    </span>
                    <span className="font-bold text-gray-900">
                        {role === 'BUYER' ? 'Collector Setup' : 'Seller Setup'}
                    </span>
                </div>
                <button 
                    onClick={handleSkipAction}
                    className="text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                    Skip
                </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-1.5">
                <div 
                    className="bg-primary-600 h-1.5 transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-lg animate-fade-in-up">
                    {steps[currentStep]}
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="bg-white px-6 py-4 border-t border-gray-100 flex justify-between items-center shrink-0 safe-area-pb">
                <button
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${
                        currentStep === 0 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    Back
                </button>
                <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-medium self-center mr-2">
                        Step {currentStep + 1} of {steps.length}
                    </span>
                    <button
                        onClick={handleNext}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                        {currentStep === steps.length - 1 ? 'Finish & Start' : 'Next'}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
