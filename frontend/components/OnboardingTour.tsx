'use client';
import { useState, useEffect } from 'react';

interface TourStep {
    target: string;
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
    {
        target: 'business-form',
        title: 'Welcome to BizMind!',
        content: 'Let\'s analyze your business location. First, enter your business details here.',
        position: 'bottom'
    },
    {
        target: 'map-section',
        title: 'Pick Your Location',
        content: 'Click anywhere on the map to select your business location. You can also search or use your current location.',
        position: 'left'
    },
    {
        target: 'preview-button',
        title: 'Get Quick Preview',
        content: 'Run a free 5-second preview to see competitor density, customer scores, and AI opinion instantly.',
        position: 'top'
    },
    {
        target: 'full-analysis',
        title: 'Unlock Full Report',
        content: 'Ready to dive deeper? Get your complete analysis with revenue forecast, strategy, and marketing plan.',
        position: 'top'
    }
];

export function useOnboardingTour() {
    const [showTour, setShowTour] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasSeenTour, setHasSeenTour] = useState(true);

    useEffect(() => {
        // Check if user has seen the tour
        const seen = localStorage.getItem('bizmind_tour_seen');
        if (!seen) {
            setHasSeenTour(false);
            // Delay showing tour slightly for page to fully render
            const timer = setTimeout(() => setShowTour(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const nextStep = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeTour();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const skipTour = () => {
        localStorage.setItem('bizmind_tour_seen', 'true');
        setShowTour(false);
        setHasSeenTour(true);
    };

    const completeTour = () => {
        localStorage.setItem('bizmind_tour_seen', 'true');
        setShowTour(false);
        setHasSeenTour(true);
    };

    const restartTour = () => {
        setCurrentStep(0);
        setShowTour(true);
    };

    return {
        showTour,
        currentStep,
        hasSeenTour,
        tourSteps,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        restartTour
    };
}

export function OnboardingTourOverlay({
    currentStep,
    tourSteps,
    onNext,
    onPrev,
    onSkip,
    onComplete
}: {
    currentStep: number;
    tourSteps: TourStep[];
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    onComplete: () => void;
}) {
    const step = tourSteps[currentStep];
    const isLastStep = currentStep === tourSteps.length - 1;

    return (
        <div className="fixed inset-0 z-[300] pointer-events-none">
            {/* Dark overlay with spotlight cutout - simplified version */}
            <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={onSkip} />
            
            {/* Tour tooltip */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-auto">
                <div className="bg-white rounded-2xl shadow-2xl p-6">
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mb-4">
                        {tourSteps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all ${
                                    idx <= currentStep ? 'bg-primary w-8' : 'bg-gray-200 w-4'
                                }`}
                            />
                        ))}
                        <span className="text-xs text-gray-500 ml-auto">
                            Step {currentStep + 1} of {tourSteps.length}
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-6">{step.content}</p>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={onSkip}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                            Skip Tour
                        </button>
                        
                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <button
                                    onClick={onPrev}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={isLastStep ? onComplete : onNext}
                                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                {isLastStep ? 'Get Started' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TourRestartButton({ onRestart }: { onRestart: () => void }) {
    return (
        <button
            onClick={onRestart}
            className="fixed bottom-4 right-4 z-40 px-4 py-2 bg-gray-900/80 hover:bg-gray-900 text-white text-sm font-medium rounded-full shadow-lg transition-all flex items-center gap-2"
        >
            <span className="material-symbols-outlined text-[18px]">tour</span>
            Restart Tour
        </button>
    );
}
