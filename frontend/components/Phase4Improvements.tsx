'use client';
import { useState, useEffect } from 'react';

interface MobileMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (lat: number, lng: number, address: string) => void;
    mapRef: React.RefObject<HTMLDivElement | null>;
}

export function MobileMapModal({ isOpen, onClose, onLocationSelect, mapRef }: MobileMapModalProps) {
    const [selectedAddress, setSelectedAddress] = useState('');
    const [hasSelection, setHasSelection] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    <h2 className="font-bold text-gray-900">Select Location</h2>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-600">close</span>
                </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
                <div ref={mapRef} className="w-full h-full" />
                
                {/* Center Pin Indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <div className="relative">
                        <span className="material-symbols-outlined text-4xl text-primary drop-shadow-lg">location_on</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-ping" />
                    </div>
                </div>

                {/* Instructions */}
                {!hasSelection && (
                    <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                        <p className="text-sm text-gray-700 text-center">
                            <span className="material-symbols-outlined text-primary align-text-bottom text-[18px]">touch_app</span>
                            {' '}Drag map or tap to select your business location
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-200 p-4 space-y-3">
                {selectedAddress && (
                    <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-xl">
                        <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                        <div>
                            <p className="text-sm font-medium text-emerald-800">Selected Location</p>
                            <p className="text-xs text-emerald-600">{selectedAddress}</p>
                        </div>
                    </div>
                )}
                
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3.5 px-4 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            if (hasSelection) {
                                onClose();
                            }
                        }}
                        disabled={!hasSelection}
                        className="flex-[2] py-3.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">check</span>
                        Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );
}

// Enhanced Loading State Component
interface LoadingStep {
    label: string;
    description: string;
    duration: number; // estimated seconds
}

const analysisSteps: LoadingStep[] = [
    { label: 'Finding Competitors', description: 'Scanning Google Maps for nearby businesses...', duration: 15 },
    { label: 'Analyzing Reviews', description: 'Reading customer feedback and ratings...', duration: 20 },
    { label: 'Demographics', description: 'Loading population density and income data...', duration: 15 },
    { label: 'Market Trends', description: 'Checking seasonal patterns and growth...', duration: 20 },
    { label: 'AI Strategy', description: 'Generating personalized business insights...', duration: 30 },
];

const funFacts = [
    "Did you know? Cafés near offices get 40% more morning traffic.",
    "Restaurants on corners have 25% higher visibility.",
    "Shops near gyms see 30% more health-conscious customers.",
    "Businesses near schools get consistent weekday traffic.",
    "Salons near metro stations have 35% higher footfall."
];

export function EnhancedLoadingState({ 
    progress, 
    estimatedTimeRemaining,
    currentStep,
    onCancel 
}: { 
    progress: number; 
    estimatedTimeRemaining: number;
    currentStep: number;
    onCancel?: () => void;
}) {
    const [factIndex, setFactIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const factTimer = setInterval(() => {
            setFactIndex(prev => (prev + 1) % funFacts.length);
        }, 8000);

        const elapsedTimer = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(factTimer);
            clearInterval(elapsedTimer);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    return (
        <div className="fixed inset-0 z-[200] bg-gray-900/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-primary to-primary-hover text-white">
                    <h2 className="text-xl font-bold">Generating Your Analysis</h2>
                    <p className="text-white/80 text-sm mt-1">This usually takes 1-2 minutes</p>
                </div>

                {/* Progress Section */}
                <div className="p-6 space-y-6">
                    {/* Main Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">Overall Progress</span>
                            <span className="font-bold text-primary">{progress}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Current Step */}
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary animate-spin">refresh</span>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{analysisSteps[currentStep]?.label || 'Processing...'}</p>
                            <p className="text-sm text-gray-600 mt-0.5">{analysisSteps[currentStep]?.description || 'Please wait...'}</p>
                        </div>
                    </div>

                    {/* Steps List */}
                    <div className="space-y-2">
                        {analysisSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className={`
                                    w-6 h-6 rounded-full flex items-center justify-center text-xs
                                    ${idx < currentStep ? 'bg-emerald-500 text-white' : ''}
                                    ${idx === currentStep ? 'bg-primary text-white animate-pulse' : ''}
                                    ${idx > currentStep ? 'bg-gray-200 text-gray-400' : ''}
                                `}>
                                    {idx < currentStep ? '✓' : idx + 1}
                                </div>
                                <span className={`text-sm ${idx <= currentStep ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {step.label}
                                </span>
                                {idx === currentStep && (
                                    <span className="ml-auto text-xs text-gray-400">~{step.duration}s</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Time Estimates */}
                    <div className="flex items-center justify-between text-sm px-1">
                        <span className="text-gray-500">Elapsed: {formatTime(elapsed)}</span>
                        <span className="text-primary font-medium">About {formatTime(estimatedTimeRemaining)} left</span>
                    </div>

                    {/* Fun Fact */}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-sm text-amber-800">
                            <span className="font-bold">💡 Tip:</span> {funFacts[factIndex]}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                {onCancel && (
                    <div className="px-6 py-4 border-t border-gray-100">
                        <button
                            onClick={onCancel}
                            className="w-full py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">cancel</span>
                            Cancel Analysis
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Competitor Detail View Component
export interface CompetitorDetail {
    name: string;
    rating: string | number;
    distance?: string | number;
    address?: string;
    totalRatings?: number;
    placeId?: string;
}

interface CompetitorDetailViewProps {
    competitors: CompetitorDetail[];
    onClose: () => void;
    businessType: string;
}

export function CompetitorDetailView({ competitors, onClose, businessType }: CompetitorDetailViewProps) {
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'rating' | 'distance'>('rating');

    const filteredCompetitors = competitors
        .filter(c => !filterRating || Number(c.rating) >= filterRating)
        .sort((a, b) => {
            if (sortBy === 'rating') return Number(b.rating) - Number(a.rating);
            return 0; // Distance would need actual numeric values
        });

    return (
        <div className="fixed inset-0 z-[110] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {competitors.length} {businessType} Competitors
                        </h2>
                        <p className="text-sm text-gray-500">Near your selected location</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">Filter by rating:</span>
                    <div className="flex gap-2">
                        {[null, 4, 4.5].map(rating => (
                            <button
                                key={String(rating)}
                                onClick={() => setFilterRating(rating)}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                    filterRating === rating 
                                        ? 'bg-primary text-white' 
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                {rating ? `${rating}+ ★` : 'All'}
                            </button>
                        ))}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm text-gray-500">Sort:</span>
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'rating' | 'distance')}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                        >
                            <option value="rating">Best Rated</option>
                            <option value="distance">Closest</option>
                        </select>
                    </div>
                </div>

                {/* Competitor List */}
                <div className="overflow-y-auto max-h-[50vh]">
                    {filteredCompetitors.map((competitor, idx) => (
                        <div key={idx} className="px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{competitor.name}</h3>
                                    {competitor.address && (
                                        <p className="text-sm text-gray-500 mt-0.5">{competitor.address}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-sm font-bold">
                                            {competitor.rating} ★
                                        </span>
                                        {competitor.totalRatings && (
                                            <span className="text-xs text-gray-400">
                                                ({competitor.totalRatings} reviews)
                                            </span>
                                        )}
                                        {competitor.distance && (
                                            <span className="text-xs text-gray-500">
                                                • {competitor.distance} away
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(competitor.name + ' ' + (competitor.address || ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-4 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="View on Google Maps"
                                >
                                    <span className="material-symbols-outlined">open_in_new</span>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        Data from Google Maps • Updated live • Click any competitor to view on Google Maps
                    </p>
                </div>
            </div>
        </div>
    );
}
