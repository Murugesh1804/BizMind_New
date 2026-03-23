'use client';

import { useEffect, useState } from 'react';
import { getAnalysisProgress } from '@/lib/api';

const TH = { fontFamily: "'Tiempos Headline', 'Playfair Display', serif" };

const STEPS = [
    { label: "Identifying location coordinates...", detail: "Resolving precise latitude and longitude via Geocoding API" },
    { label: "Scanning nearby competition...", detail: "Locating surrounding businesses within your chosen radius" },
    { label: "Analyzing customer demographics...", detail: "Synthesizing residential, office, and transit footfall patterns" },
    { label: "Processing customer sentiment...", detail: "Summarizing thousands of reviews via AI compression" },
    { label: "Generating strategic insights...", detail: "Groq AI is formulating your business strategy" },
    { label: "Finalizing success probability...", detail: "Calculating final scores and preparing your report" }
];

// Fun facts for Phase 4 loading experience
const FUN_FACTS = [
    "Did you know? Cafés near offices get 40% more morning traffic.",
    "Restaurants on corners have 25% higher visibility.",
    "Shops near gyms see 30% more health-conscious customers.",
    "Businesses near schools get consistent weekday traffic.",
    "Salons near metro stations have 35% higher footfall.",
    "Bookstores near colleges see 50% more student customers.",
    "Grocery stores near residential areas get evening rush traffic."
];

interface AnalysisLoaderProps {
    businessName?: string;
    taskId?: string;
    onCancel?: () => void;
}

export default function AnalysisLoader({ businessName, taskId, onCancel }: AnalysisLoaderProps) {
    const [progress, setProgress] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [currentStepInfo, setCurrentStepInfo] = useState({ step: 0, status: STEPS[0].label });
    const [visibleStepIndices, setVisibleStepIndices] = useState<number[]>([]);
    const [funFactIndex, setFunFactIndex] = useState(0);
    const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(120); // 2 minutes estimate

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Rotate fun facts every 10 seconds
    useEffect(() => {
        const factTimer = setInterval(() => {
            setFunFactIndex(prev => (prev + 1) % FUN_FACTS.length);
        }, 10000);
        return () => clearInterval(factTimer);
    }, []);

    // Calculate estimated time remaining
    useEffect(() => {
        if (progress > 0) {
            const elapsed = seconds;
            const rate = progress / elapsed; // percent per second
            const remaining = (100 - progress) / rate;
            setEstimatedTimeLeft(Math.max(10, Math.round(remaining)));
        }
    }, [progress, seconds]);

    // REAL-TIME PROGRESS POLLING
    useEffect(() => {
        let isMounted = true;

        const pollProgress = async () => {
            try {
                const data = await getAnalysisProgress(taskId); // Returns { step: X, status: "...", progress: Y }

                if (!isMounted) return;

                if (data && data.step !== -1) {
                    // Update main progress bar
                    setProgress(data.progress || 0);

                    // Update active step info
                    setCurrentStepInfo({
                        step: data.step,
                        status: data.status || STEPS[data.step]?.label
                    });

                    // Update the list of completed steps (all indices before the current step)
                    const completed = [];
                    for (let i = 0; i < data.step; i++) {
                        completed.push(i);
                    }
                    setVisibleStepIndices(completed);
                }
            } catch (err) {
                console.error("Progress poll failed:", err);
            }
        };

        // Initial poll
        pollProgress();

        // Continue polling every 1.5 seconds while analysis is in flight
        const interval = setInterval(pollProgress, 1500);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#F9F9F8]/60 backdrop-blur-sm p-4">

            {/* Pop-up Card */}
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Top Shimmer Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 relative overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#1d73c9] to-[#38bdf8] transition-all duration-700 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ width: '200%' }} />
                    </div>
                </div>

                {/* Header Area */}
                <header className="px-8 pt-8 pb-6 border-b border-slate-50 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight" style={TH}>
                            Analysing <span className="text-[#1d73c9]">"{businessName || 'Business'}"</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">AI-Powered Market Analysis</p>
                    </div>

                    <div className="text-right">
                        <div className="text-2xl font-bold text-[#1d73c9] tabular-nums" style={TH}>
                            {Math.round(progress)}%
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center justify-end uppercase tracking-wider">
                            <span className="material-symbols-outlined text-xs mr-1">timer</span>
                            {formatTime(seconds)}
                        </div>
                    </div>
                </header>

                {/* Thought Stream / Steps Section */}
                <div className="px-8 py-8 space-y-4 min-h-[320px]">

                    {/* Previous completed steps (faded) */}
                    {visibleStepIndices.map((idx) => (
                        <div key={idx} className="flex items-center gap-4 opacity-40 transition-opacity">
                            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-sm font-bold">check</span>
                            </div>
                            <span className="text-sm font-medium text-slate-600 line-through decoration-slate-300">
                                {STEPS[idx].label}
                            </span>
                        </div>
                    ))}

                    {/* Current Active Step (Synced with Backend) */}
                    {currentStepInfo.step !== -1 && (
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-[#1d73c9]/5 border border-[#1d73c9]/10 shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1d73c9] text-white shadow-lg shadow-[#1d73c9]/20">
                                <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {currentStepInfo.status}
                                    </h3>
                                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1d73c9] bg-[#1d73c9]/10 rounded border border-[#1d73c9]/20 animate-pulse">
                                        Running
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed italic">
                                    {STEPS[currentStepInfo.step]?.detail || "Processing real-time market signals..."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pending steps placeholder (to keep height stable) */}
                    {Array.from({ length: Math.max(0, STEPS.length - currentStepInfo.step - 1) }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 opacity-10">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0" />
                            <div className="h-2 w-32 bg-slate-200 rounded" />
                        </div>
                    ))}
                </div>

                {/* Card Footer */}
                <footer className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 space-y-3">
                    {/* Fun Fact - Phase 4 */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="material-symbols-outlined text-amber-600 text-sm">lightbulb</span>
                        <p className="text-xs text-amber-800 leading-relaxed">
                            <span className="font-semibold">Tip:</span> {FUN_FACTS[funFactIndex]}
                        </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                                Live Backend Sync
                            </span>
                            <span className="text-[10px] text-slate-500">
                                ~{Math.ceil(estimatedTimeLeft / 10) * 10}s remaining
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Cancel Analysis
                                </button>
                            )}
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Groq AI + Google Maps
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2.5s infinite linear;
                }
            `}</style>
        </div>
    );
}