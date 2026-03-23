'use client';
import { useState } from 'react';

interface ScoreBreakdownProps {
    label: string;
    value: string | number;
    breakdown: {
        label: string;
        score: number;
        description: string;
    }[];
    comparisonText?: string;
}

export function ScoreBreakdown({ label, value, breakdown, comparisonText }: ScoreBreakdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 group"
            >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
                <span className="material-symbols-outlined text-[14px] text-gray-400 group-hover:text-primary transition-colors">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-gray-900">{label}: {value}</span>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                    
                    <div className="space-y-2">
                        {breakdown.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700">
                                    {item.score}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-900">{item.label}</p>
                                    <p className="text-[10px] text-gray-500">{item.description}</p>
                                </div>
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${
                                            item.score >= 8 ? 'bg-emerald-500' : 
                                            item.score >= 6 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${(item.score / 10) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {comparisonText && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-[11px] text-gray-600">{comparisonText}</p>
                        </div>
                    )}

                    <a 
                        href="#" 
                        className="mt-3 block text-[11px] text-primary hover:underline text-center"
                        onClick={(e) => e.preventDefault()}
                    >
                        How we calculate this →
                    </a>

                    {/* Arrow */}
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45" />
                </div>
            )}
        </div>
    );
}

interface DataFreshnessBadgeProps {
    timestamp?: Date;
}

export function DataFreshnessBadge({ timestamp }: DataFreshnessBadgeProps) {
    const getTimeAgo = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    const displayTime = timestamp ? getTimeAgo(timestamp) : 'Live data';

    return (
        <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Google Maps Data
            </span>
            <span className="text-[10px] text-gray-400">
                Updated {displayTime}
            </span>
        </div>
    );
}

interface PrivacyBadgeProps {
    showFull?: boolean;
}

export function PrivacyBadge({ showFull = false }: PrivacyBadgeProps) {
    if (showFull) {
        return (
            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="text-xs">🔒</span>
                    <span className="text-xs font-medium text-slate-700">Your data is encrypted and never shared</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600">
                        <span className="material-symbols-outlined text-[12px]">shield</span>
                        SSL Encrypted
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600">
                        <span className="material-symbols-outlined text-[12px]">cloud_done</span>
                        Secure Cloud
                    </span>
                </div>
                <a href="#" className="text-[10px] text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                    Read our Privacy Policy →
                </a>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                <span className="material-symbols-outlined text-[12px]">shield</span>
                🔒 SSL Encrypted
            </span>
        </div>
    );
}

export function ProgressBar({ currentPhase, phases }: { currentPhase: number; phases: string[] }) {
    return (
        <div className="w-full bg-white border-b border-gray-200 px-4 py-3">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                    {phases.map((phase, idx) => (
                        <div key={idx} className="flex items-center">
                            <div className={`
                                w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                                ${idx < currentPhase ? 'bg-emerald-500 text-white' : ''}
                                ${idx === currentPhase ? 'bg-primary text-white ring-2 ring-primary/20' : ''}
                                ${idx > currentPhase ? 'bg-gray-200 text-gray-400' : ''}
                            `}>
                                {idx < currentPhase ? '✓' : idx + 1}
                            </div>
                            <span className={`
                                ml-1.5 text-[11px] font-medium hidden sm:block
                                ${idx <= currentPhase ? 'text-gray-700' : 'text-gray-400'}
                            `}>
                                {phase}
                            </span>
                            {idx < phases.length - 1 && (
                                <div className={`
                                    w-8 h-0.5 mx-2 sm:mx-4
                                    ${idx < currentPhase ? 'bg-emerald-500' : 'bg-gray-200'}
                                `} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="text-center">
                    <span className="text-xs text-gray-500">
                        Step {currentPhase + 1} of {phases.length}: {phases[currentPhase]}
                    </span>
                </div>
            </div>
        </div>
    );
}
