'use client';
import { useEffect, useState, useRef } from 'react';

const TH = { fontFamily: "'Tiempos Headline', 'Playfair Display', serif" };

/* ── Backend pipeline steps ─────────────────────────────────────────────── */
const STEPS = [
    {
        id: 0,
        icon: 'location_on',
        label: 'Geocoding Location',
        detail: 'Resolving coordinates from your address',
        durationMs: 1800,
    },
    {
        id: 1,
        icon: 'travel_explore',
        label: 'Scanning Nearby Competitors',
        detail: 'Querying Google Maps within your search radius',
        durationMs: 3500,
    },
    {
        id: 2,
        icon: 'groups',
        label: 'Analysing Customer Base',
        detail: 'Counting residential, education, office & transit points',
        durationMs: 3000,
    },
    {
        id: 3,
        icon: 'rate_review',
        label: 'Processing Reviews',
        detail: 'Extracting sentiment from competitor reviews',
        durationMs: 2500,
    },
    {
        id: 4,
        icon: 'psychology',
        label: 'Running AI Insights',
        detail: 'Groq LLM + RAG generating market strategy',
        durationMs: 5000,
    },
    {
        id: 5,
        icon: 'verified',
        label: 'Calculating Success Score',
        detail: 'Weighting competition, demand, rating & opportunity',
        durationMs: 1200,
    },
];

const TOTAL_MS = STEPS.reduce((s, st) => s + st.durationMs, 0);

interface Props {
    businessName?: string;
    businessType?: string;
}

export default function AnalysisLoader({ businessName, businessType }: Props) {
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [elapsed, setElapsed] = useState(0);
    const [progress, setProgress] = useState(0);
    const startRef = useRef(Date.now());
    const raf = useRef<ReturnType<typeof requestAnimationFrame> | undefined>(undefined);

    /* ── Progress bar + timer ─────────────────────────────────────────── */
    useEffect(() => {
        const tick = () => {
            const ms = Date.now() - startRef.current;
            setElapsed(Math.floor(ms / 1000));
            setProgress(Math.min(95, (ms / TOTAL_MS) * 100));
            raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => {
            if (raf.current !== undefined) cancelAnimationFrame(raf.current);
        };
    }, []);

    /* ── Step sequencer ──────────────────────────────────────────────── */
    useEffect(() => {
        let acc = 0;
        const timers: ReturnType<typeof setTimeout>[] = [];
        STEPS.forEach((step, i) => {
            timers.push(setTimeout(() => setActiveStep(i), acc));
            acc += step.durationMs;
            timers.push(setTimeout(() => setCompletedSteps(prev => [...prev, i]), acc));
        });
        return () => timers.forEach(clearTimeout);
    }, []);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    return (
        /* Light-themed full-screen overlay */
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#F9F9F8]/90 backdrop-blur-sm"
            style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* Card */}
            <div className="w-full max-w-md mx-4 bg-white rounded-2xl border border-[#E5E5E5] shadow-xl overflow-hidden">

                {/* Top accent strip */}
                <div className="h-1 w-full bg-[#1d73c9]">
                    <div
                        className="h-full bg-[#1d73c9] transition-all duration-500 ease-out"
                        style={{
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #1d73c9 0%, #38bdf8 50%, #1d73c9 100%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer-light 2s linear infinite',
                        }}
                    />
                </div>

                <div className="p-8">

                    {/* Header */}
                    <div className="flex items-start gap-4 mb-7">
                        {/* Icon with soft pulse ring */}
                        <div className="relative shrink-0 mt-0.5">
                            <div className="absolute inset-0 rounded-full bg-[#1d73c9]/15 animate-ping" />
                            <div className="relative w-12 h-12 rounded-xl bg-[#1d73c9]/10 border border-[#1d73c9]/20 flex items-center justify-center">
                                <span
                                    className="material-symbols-outlined text-[#1d73c9]"
                                    style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
                                >
                                    psychology
                                </span>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-[#2D2D2D] leading-tight" style={TH}>
                                {businessName ? `Analysing "${businessName}"` : 'Running Analysis'}
                            </h2>
                            <p className="text-xs text-[#6B7280] mt-1 capitalize">
                                {businessType ? `${businessType} · ` : ''}AI-powered market analysis
                            </p>
                            {/* Timer + percent row */}
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-[#6B7280] flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
                                    <span className="font-semibold text-[#2D2D2D]">{formatTime(elapsed)}</span>
                                </span>
                                <span className="text-xs font-bold text-[#1d73c9]">{Math.round(progress)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-7">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${progress}%`,
                                background: 'linear-gradient(90deg, #1d73c9, #38bdf8)',
                            }}
                        />
                    </div>

                    {/* Steps */}
                    <div className="space-y-1.5">
                        {STEPS.map((step, i) => {
                            const isDone = completedSteps.includes(i);
                            const isActive = activeStep === i && !isDone;

                            return (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-400 ${isActive ? 'bg-[#1d73c9]/6 border border-[#1d73c9]/15' :
                                            isDone ? 'bg-[#F9F9F8] border border-transparent' :
                                                'border border-transparent opacity-40'
                                        }`}
                                >
                                    {/* State icon */}
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-50' :
                                            isActive ? 'bg-[#1d73c9]/10' :
                                                'bg-[#F3F4F6]'
                                        }`}>
                                        {isDone ? (
                                            <span
                                                className="material-symbols-outlined text-emerald-500"
                                                style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}
                                            >
                                                check_circle
                                            </span>
                                        ) : isActive ? (
                                            <span
                                                className="material-symbols-outlined text-[#1d73c9] animate-spin"
                                                style={{ fontSize: '15px' }}
                                            >
                                                refresh
                                            </span>
                                        ) : (
                                            <span
                                                className="material-symbols-outlined text-[#9CA3AF]"
                                                style={{ fontSize: '15px' }}
                                            >
                                                {step.icon}
                                            </span>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium leading-tight ${isDone ? 'text-[#6B7280]' :
                                                isActive ? 'text-[#2D2D2D]' :
                                                    'text-[#9CA3AF]'
                                            }`}>
                                            {step.label}
                                        </p>
                                        {isActive && (
                                            <p className="text-[10px] text-[#6B7280] mt-0.5 leading-snug">
                                                {step.detail}
                                            </p>
                                        )}
                                    </div>

                                    {/* Badge */}
                                    {isDone && (
                                        <span className="shrink-0 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                            Done
                                        </span>
                                    )}
                                    {isActive && (
                                        <span className="shrink-0 text-[9px] font-bold text-[#1d73c9] bg-[#1d73c9]/8 border border-[#1d73c9]/20 px-1.5 py-0.5 rounded-full animate-pulse">
                                            Running
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <p className="text-center text-[10px] text-[#9CA3AF] mt-6 font-medium tracking-wide">
                        Powered by <span className="text-[#1d73c9]">Groq AI</span> + Google Maps · ~15–25 seconds
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes shimmer-light {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}
