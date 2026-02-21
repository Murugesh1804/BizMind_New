'use client';
import { useState } from 'react';
import DashboardNav from '@/components/DashboardNav';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import { formatInsight } from '@/lib/formatInsight';
import { useAnalysisData } from '@/lib/hooks';
import type { AnalysisResult } from '@/lib/types';

const TH = { fontFamily: "'Tiempos Headline', 'Playfair Display', serif" };

const SECTIONS = [
    {
        key: 'competitive_landscape',
        label: 'Customer Sentiment',
        icon: 'sentiment_satisfied',
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        border: 'border-violet-100',
        desc: 'What customers say about existing competitors',
    },
    {
        key: 'customer_insights',
        label: 'Market Opportunity',
        icon: 'trending_up',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        desc: 'Demand signals and untapped niches in this area',
    },
    {
        key: 'pricing_insights',
        label: 'Pricing Strategy',
        icon: 'payments',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
        desc: 'Recommended price bands and positioning for Indian MSMEs',
    },
    {
        key: 'customer_base_ai',   // pulled from ai_insights.customer_base
        label: 'Customer Base Analysis',
        icon: 'groups',
        color: 'text-[#1d73c9]',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        desc: 'Residential, student and professional segments in this location',
    },
    {
        key: 'risk_assessment',
        label: 'Risk Factors',
        icon: 'warning',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-100',
        desc: 'Operational, financial, and competitive risks to watch',
    },
    {
        key: 'strategic_recommendations',
        label: 'Strategic Recommendations',
        icon: 'lightbulb',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        desc: '30-day execution plan and quick-win tactics',
    },
];

function InsightCard({ section, content }: { section: typeof SECTIONS[0]; content: string }) {
    const [open, setOpen] = useState(true);
    const formatted = formatInsight(content);

    if (!content || content === 'No data available') return null;

    return (
        <div className={`bg-white rounded-xl border ${section.border} overflow-hidden transition-all`}>
            {/* Card header */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#F9F9F8] transition-colors"
            >
                <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined ${section.color}`}
                        style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                        {section.icon}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#2D2D2D]" style={TH}>{section.label}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{section.desc}</p>
                </div>
                <span
                    className="material-symbols-outlined text-[#9CA3AF] transition-transform duration-200 shrink-0"
                    style={{ fontSize: '20px', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                    expand_more
                </span>
            </button>

            {/* Card body */}
            {open && (
                <div className="px-5 pb-5 pt-1 border-t border-[#F3F4F6]">
                    <div
                        className="ai-insight-content"
                        dangerouslySetInnerHTML={{ __html: formatted }}
                    />
                </div>
            )}
        </div>
    );
}

export default function InsightsPage() {
    const { data, isLoading } = useAnalysisData();

    if (!data || isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F9F9F8]">
                <span className="material-symbols-outlined text-6xl text-[#1d73c9] animate-spin">refresh</span>
                <p className="text-[#6B7280] font-medium">Loading insights…</p>
            </div>
        );
    }

    // Build content map — pull customer_base from nested ai_insights if available
    const contentMap: Record<string, string> = {
        competitive_landscape: data.competitive_landscape || '',
        customer_insights: data.customer_insights || '',
        pricing_insights: data.pricing_insights || data.ai_insights?.pricing || '',
        customer_base_ai: data.ai_insights?.customer_base || '',
        risk_assessment: data.risk_assessment || '',
        strategic_recommendations: data.strategic_recommendations || '',
    };

    const availableCount = SECTIONS.filter(s => contentMap[s.key] && contentMap[s.key] !== 'No data available').length;

    return (
        <DashboardErrorBoundary>
            <div className="pt-16">
                <DashboardNav />
                <main className="pt-6 pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-[#2D2D2D]" style={TH}>AI Insights</h1>
                            <p className="text-sm text-[#6B7280] mt-0.5">
                                {availableCount} of {SECTIONS.length} sections available · {data.business_name}
                            </p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-2 text-xs text-[#6B7280] bg-[#F9F9F8] border border-[#E5E5E5] rounded-lg px-4 py-2.5">
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>info</span>
                        <span>
                            <strong className="text-[#2D2D2D]">Bold text</strong> highlights key findings.
                            Click any card header to collapse/expand.
                        </span>
                    </div>

                    {/* Insight cards — 2 column grid on md+ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {SECTIONS.map((sec) => (
                            <InsightCard
                                key={sec.key}
                                section={sec}
                                content={contentMap[sec.key]}
                            />
                        ))}
                    </div>

                    {/* Full analysis fallback */}
                    {data.market_analysis && (
                        <div className="bg-[#111921] text-white rounded-2xl p-7 relative overflow-hidden">
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#1d73c9]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>article</span>
                                    <h2 className="text-lg font-bold" style={TH}>Full AI Analysis</h2>
                                </div>
                                <div
                                    className="ai-insight-content text-slate-300"
                                    dangerouslySetInnerHTML={{ __html: formatInsight(data.market_analysis) }}
                                />
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#1d73c9]/15 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
                        </div>
                    )}

                </main>
            </div>
        </DashboardErrorBoundary>
    );
}
