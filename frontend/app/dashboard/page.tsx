'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import { useAnalysisData } from '@/lib/hooks';
import type { AnalysisResult, FeatureData } from '@/lib/types';
import Link from 'next/link';

ChartJS.register(ArcElement, Tooltip, Legend);

const TH = { fontFamily: "'Tiempos Headline', 'Playfair Display', serif" };

function viabilityLabel(score: number) {
    if (score >= 7) return { text: 'Strongly Recommended', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 4) return { text: 'Moderate Potential', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { text: 'Not Recommended', cls: 'text-red-700 bg-red-50 border-red-200' };
}

function ScorePill({ score }: { score: number }) {
    const v = viabilityLabel(score);
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${v.cls}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>
                {score >= 7 ? 'check_circle' : score >= 4 ? 'info' : 'cancel'}
            </span>
            {v.text}
        </span>
    );
}

function SubScoreBar({ label, value, icon }: { label: string; value: number; icon: string }) {
    const pct = Math.round(value * 100);
    const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#6B7280] font-medium">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{icon}</span>
                    {label}
                </span>
                <span className="font-bold text-[#2D2D2D]">{pct}%</span>
            </div>
            <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const { data, isLoading } = useAnalysisData();

    if (!data || isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F9F9F8]">
                <span className="material-symbols-outlined text-6xl text-[#1d73c9] animate-spin">refresh</span>
                <p className="text-[#6B7280] font-medium">Loading your analysis…</p>
            </div>
        );
    }

    const scorePct = Math.round((data.success_score / 10) * 100);
    const features = (data.features || {}) as Partial<FeatureData>;

    const doughnutData = {
        datasets: [{
            data: [data.success_score, 10 - data.success_score],
            backgroundColor: ['#1d73c9', '#F3F4F6'],
            borderWidth: 0,
        }],
    };

    const metrics = [
        { label: 'Competitors Found', value: data.competitors_count ?? data.competitors?.length ?? '—', icon: 'storefront', color: 'text-[#1d73c9]' },
        { label: 'Avg Rating', value: data.avg_competitor_rating != null ? `${parseFloat(String(data.avg_competitor_rating)).toFixed(1)} ★` : '—', icon: 'star', color: 'text-amber-500' },
        { label: 'Total Reviews', value: features.total_reviews?.toLocaleString() ?? '—', icon: 'rate_review', color: 'text-violet-500' },
        { label: 'Customer Score', value: data.customer_score ? `${data.customer_score}/100` : '—', icon: 'groups', color: 'text-emerald-500' },
        { label: 'Competition Level', value: features.competition_level ?? '—', icon: 'density_medium', color: 'text-orange-500' },
        { label: 'Demand Level', value: features.demand_level ?? '—', icon: 'trending_up', color: 'text-pink-500' },
    ];

    const subScores = [
        { label: 'Competition', value: features.competition_score ?? 0, icon: 'storefront' },
        { label: 'Demand', value: features.demand_score ?? 0, icon: 'trending_up' },
        { label: 'Rating', value: features.rating_score ?? 0, icon: 'star' },
        { label: 'Opportunity', value: features.opportunity_score ?? 0, icon: 'lightbulb' },
    ];

    return (
        <DashboardErrorBoundary>
            <div>
                <main className="pt-6 pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-8" style={{ fontFamily: 'Inter, sans-serif' }}>

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#2D2D2D]" style={TH}>
                                {data.business_name}
                            </h1>
                            <p className="text-[#6B7280] text-sm flex flex-col sm:flex-row sm:items-center gap-1.5">
                                <span className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
                                    {data.location}
                                </span>
                                <span className="hidden sm:inline text-[#D1D5DB]">·</span>
                                <span className="capitalize">{data.business_type}</span>
                                <span className="hidden sm:inline text-[#D1D5DB]">·</span>
                                <span className="capitalize">{data.owner_type === 'new' ? 'New Entrepreneur' : 'Existing Business'}</span>
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                                <ScorePill score={data.success_score} />
                                <span className="text-xs text-[#6B7280] border border-[#E5E5E5] rounded-full px-2.5 py-0.5">
                                    {data.radius}m radius
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <button onClick={() => router.push('/')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm font-semibold text-[#2D2D2D] hover:border-[#1d73c9]/40 hover:bg-[#F9F9F8] transition-all focus:outline-none focus:ring-2 focus:ring-primary/20">
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                                New Analysis
                            </button>
                            <Link href="/history"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm font-semibold text-[#2D2D2D] hover:border-[#1d73c9]/40 hover:bg-[#F9F9F8] transition-all focus:outline-none focus:ring-2 focus:ring-primary/20">
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
                                History
                            </Link>
                        </div>
                    </div>

                    {/* Score + sub-scores */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                        {/* Doughnut ring */}
                        <div className="md:col-span-4 bg-white rounded-xl border border-[#E5E5E5] p-8 flex flex-col items-center justify-center gap-4">
                            <div className="relative w-44 h-44">
                                <Doughnut data={doughnutData} options={{ cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-[#1d73c9]" style={TH}>{scorePct}%</span>
                                    <span className="text-xs text-[#6B7280] mt-0.5">Success Score</span>
                                </div>
                            </div>
                            <ScorePill score={data.success_score} />
                        </div>

                        {/* Sub-score breakdown */}
                        <div className="md:col-span-8 bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
                            <h2 className="text-base font-bold text-[#2D2D2D]" style={TH}>Score Breakdown</h2>
                            <div className="space-y-4">
                                {subScores.map((s) => (
                                    <SubScoreBar key={s.label} label={s.label} value={s.value} icon={s.icon} />
                                ))}
                            </div>
                            <p className="text-[10px] text-[#9CA3AF] pt-1">
                                Success Score = 25% competition + 25% rating + 30% demand + 20% opportunity
                            </p>
                        </div>
                    </div>

                    {/* 6-metric grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {metrics.map((m, i) => (
                            <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-5 hover:border-[#1d73c9]/30 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{m.label}</p>
                                    <span className={`material-symbols-outlined ${m.color}`} style={{ fontSize: '18px' }}>{m.icon}</span>
                                </div>
                                <p className="text-2xl font-bold text-[#2D2D2D]" style={TH}>{m.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* CTA strip */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { href: '/dashboard/market', icon: 'storefront', label: 'Market & Competition', desc: 'Competitors, heatmap, customer density' },
                            { href: '/dashboard/insights', icon: 'psychology', label: 'AI Insights', desc: 'Pricing, risks, recommendations & more' },
                            { href: '/dashboard/report', icon: 'description', label: 'Download Report', desc: 'Print or export branded PDF report' },
                        ].map((c) => (
                            <Link key={c.href} href={c.href}
                                className="group flex items-center gap-4 p-5 bg-white rounded-xl border border-[#E5E5E5] hover:border-[#1d73c9]/40 hover:shadow-md transition-all">
                                <div className="w-10 h-10 rounded-lg bg-[#1d73c9]/10 flex items-center justify-center shrink-0 group-hover:bg-[#1d73c9]/20 transition-colors">
                                    <span className="material-symbols-outlined text-[#1d73c9]" style={{ fontSize: '20px' }}>{c.icon}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-[#2D2D2D]">{c.label}</p>
                                    <p className="text-xs text-[#6B7280] mt-0.5">{c.desc}</p>
                                </div>
                                <span className="material-symbols-outlined text-[#D1D5DB] ml-auto group-hover:text-[#1d73c9] transition-colors" style={{ fontSize: '20px' }}>arrow_forward</span>
                            </Link>
                        ))}
                    </div>

                </main>
            </div>
        </DashboardErrorBoundary>
    );
}
