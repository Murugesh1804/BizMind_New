'use client';

import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import React from 'react';

// Robust markdown renderer - handles tables, bullets, bold etc.
function RenderMD({ text, className }: { text: string; className?: string }) {
    if (!text) return null;
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty
        if (!trimmed) { i++; continue; }

        // Table row (| col | col |)
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            // Skip separator rows (|----|)
            if (trimmed.replace(/[\|\-\s]/g, '') === '') { i++; continue; }
            const cols = trimmed.split('|').map(c => c.trim()).filter(Boolean);
            const isHeader = i === 0 || lines[i - 1]?.trim()?.startsWith('|');
            elements.push(
                <div key={i} className={`flex gap-2 py-2 border-b border-gray-100 last:border-0 text-sm ${isHeader && lines[i + 1]?.includes('---') ? 'font-bold text-gray-900 bg-gray-50 px-2 rounded-lg' : 'px-2'}`}>
                    <span className="w-1/3 font-semibold text-gray-800">{cols[0]}</span>
                    <span className="w-1/3 text-gray-500">{cols[1]}</span>
                    <span className="w-1/3 text-right text-blue-600 font-medium">{cols[2]}</span>
                    {cols[3] && <span className="w-1/4 text-right text-gray-400 text-xs">{cols[3]}</span>}
                </div>
            );
            i++; continue;
        }
        // H3
        if (trimmed.startsWith('### ')) {
            elements.push(<h3 key={i} className="text-sm font-bold text-gray-900 mt-5 mb-2 uppercase tracking-wide flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
                {trimmed.replace('### ', '')}
            </h3>);
            i++; continue;
        }
        // H2
        if (trimmed.startsWith('## ')) {
            elements.push(<h2 key={i} className="text-base font-bold text-gray-900 mt-6 mb-3">{trimmed.replace('## ', '')}</h2>);
            i++; continue;
        }
        // Bullet
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            const content = trimmed.replace(/^[-•]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            elements.push(
                <div key={i} className="flex items-start gap-2 my-1.5">
                    <span className="text-blue-500 font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-gray-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            );
            i++; continue;
        }
        // Numbered
        if (trimmed.match(/^\d+\.\s/)) {
            const num = trimmed.split('.')[0];
            const content = trimmed.substring(trimmed.indexOf('.') + 1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            elements.push(
                <div key={i} className="flex items-start gap-2 my-1.5">
                    <span className="text-blue-600 font-bold text-xs bg-blue-50 px-1.5 py-0.5 rounded shrink-0">{num}</span>
                    <span className="text-gray-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            );
            i++; continue;
        }
        // Plain text
        const plainHtml = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(<p key={i} className="text-gray-700 text-sm leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: plainHtml }} />);
        i++;
    }
    return <div className={className}>{elements}</div>;
}

function SectionCard({
    title, icon, iconColor, bgColor, borderColor, children
}: {
    title: string; icon: string; iconColor: string; bgColor: string; borderColor: string; children: React.ReactNode
}) {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border ${borderColor} overflow-hidden`}>
            <div className={`${bgColor} px-6 py-4 border-b ${borderColor} flex items-center gap-3`}>
                <span className={`material-symbols-outlined ${iconColor} text-xl`}>{icon}</span>
                <h2 className={`font-bold text-gray-900 text-sm`}>{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function MarketingPage() {
    const { data, isLoading } = useAnalysisData();

    if (isLoading) {
        return <div className="animate-pulse space-y-6 max-w-5xl mx-auto pt-6">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl w-full" />)}
        </div>;
    }

    if (!data || !data.marketing_intel) {
        return <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm mx-auto max-w-2xl mt-8 border border-gray-100">
            <span className="material-symbols-outlined text-4xl text-gray-300 block mb-3">campaign</span>
            Marketing intelligence is not available. Please run a new analysis.
        </div>;
    }

    const intel = data.marketing_intel;
    const influencers = intel.influencers ?? [];

    // Backend field names -> use correct ones
    const channelsTable    = intel.channels_table   ?? '';
    const adSpend          = intel.ad_spend         ?? '';
    const cacEstimate      = intel.cac_estimate     ?? '';
    const communityTactics = intel.community_tactics ?? '';
    const contentStrategy  = intel.content_strategy  ?? '';
    const fullPlan         = intel.full_plan         ?? '';

    // City tier badge
    const tier = data.revenue_simulation?.tier ?? data.cost_breakdown?.tier ?? '';

    return (
        <DashboardErrorBoundary>
            <div className="animate-fade-in font-sans space-y-8">
                
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 border-b border-gray-200 pb-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-purple-600 !text-3xl">campaign</span>
                        Hyper-Local Marketing Intelligence
                        {tier && <span className="ml-auto text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full uppercase tracking-wider">
                            {tier} Tier
                        </span>}
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm max-w-3xl">
                        AI-tailored marketing strategy for <strong>{data.business_type}</strong> in <strong>{data.location}</strong>.
                        All budgets and tactics are calibrated to the local market.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - AI Plan */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Best Channels Table */}
                        {channelsTable && (
                            <SectionCard
                                title="Best Marketing Channels (AI Matched)"
                                icon="hub"
                                iconColor="text-purple-600"
                                bgColor="bg-purple-50"
                                borderColor="border-purple-100"
                            >
                                <RenderMD text={channelsTable} />
                            </SectionCard>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Budget Allocation */}
                            {(adSpend || cacEstimate) && (
                                <SectionCard
                                    title="Budget Allocation & CAC"
                                    icon="payments"
                                    iconColor="text-blue-600"
                                    bgColor="bg-blue-50"
                                    borderColor="border-blue-100"
                                >
                                    {adSpend && <RenderMD text={adSpend} />}
                                    {cacEstimate && (
                                        <div className="mt-3 pt-3 border-t border-blue-100">
                                            <RenderMD text={cacEstimate} />
                                        </div>
                                    )}
                                </SectionCard>
                            )}

                            {/* Local Community Tactics */}
                            {communityTactics && (
                                <SectionCard
                                    title="Local Community Tactics"
                                    icon="diversity_1"
                                    iconColor="text-emerald-600"
                                    bgColor="bg-emerald-50"
                                    borderColor="border-emerald-100"
                                >
                                    <RenderMD text={communityTactics} />
                                </SectionCard>
                            )}
                        </div>

                        {/* Content Strategy */}
                        {contentStrategy && (
                            <SectionCard
                                title="Content & Creative Strategy"
                                icon="photo_camera"
                                iconColor="text-amber-600"
                                bgColor="bg-amber-50"
                                borderColor="border-amber-100"
                            >
                                <RenderMD text={contentStrategy} />
                            </SectionCard>
                        )}

                        {/* Full Plan fallback */}
                        {!channelsTable && fullPlan && (
                            <SectionCard
                                title="Complete Marketing Plan"
                                icon="article"
                                iconColor="text-gray-600"
                                bgColor="bg-gray-50"
                                borderColor="border-gray-100"
                            >
                                <RenderMD text={fullPlan} />
                            </SectionCard>
                        )}
                    </div>

                    {/* Right Column - Influencers */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-pink-900 to-rose-900 text-white rounded-2xl shadow-lg border border-pink-800/50 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
                            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2 relative z-10">
                                <span className="material-symbols-outlined text-pink-300">record_voice_over</span>
                                <h2 className="font-bold">Top Local Influencers</h2>
                            </div>
                            <div className="p-5 space-y-4 relative z-10">
                                {influencers.length === 0 ? (
                                    <p className="text-pink-200 text-sm">No specific influencers found for this niche in the location. Try following up manually.</p>
                                ) : (
                                    influencers.map((inf: any, idx: number) => (
                                        <a
                                            key={idx}
                                            href={inf.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-white/10 hover:bg-white/20 transition-colors border border-white/10 rounded-xl p-4 group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-white group-hover:text-pink-300 transition-colors">{inf.handle}</span>
                                                <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full">{inf.platform}</span>
                                            </div>
                                            <p className="text-sm text-pink-100 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px]">mail</span>
                                                {inf.contact}
                                            </p>
                                            <p className="text-[11px] text-pink-300/70 mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                                {inf.url.replace('https://', '').slice(0, 40)}...
                                            </p>
                                        </a>
                                    ))
                                )}
                            </div>
                            <div className="p-4 bg-black/20 text-xs text-pink-200 flex items-start gap-2 relative z-10">
                                <span className="material-symbols-outlined text-[16px] shrink-0">info</span>
                                <span>These accounts match your business type and location via Google search. Reach out for barter or paid promotions.</span>
                            </div>
                        </div>

                        {/* Quick marketing tips based on city tier */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500 text-[18px]">lightbulb</span>
                                Quick Indian SME Marketing Tips
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { icon: 'store', text: 'Register your business on Google My Business — it\'s free and drives local SEO' },
                                    { icon: 'groups', text: 'Join local RWA / Colony WhatsApp groups for zero-cost neighbourhood marketing' },
                                    { icon: 'thumb_up', text: 'Ask every happy customer to leave a Google review — this is your best growth lever' },
                                    { icon: 'local_offer', text: 'Run a "Grand Opening" 15% discount for first 7 days to drive trial visits' },
                                ].map((tip, i) => (
                                    <div key={i} className="flex items-start gap-3 text-sm">
                                        <span className="material-symbols-outlined text-blue-500 text-[16px] mt-0.5 shrink-0">{tip.icon}</span>
                                        <p className="text-gray-600 leading-relaxed">{tip.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardErrorBoundary>
    );
}
