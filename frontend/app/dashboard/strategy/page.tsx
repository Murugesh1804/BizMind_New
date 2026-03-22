'use client';
import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';

export default function LaunchStrategyPage() {
    const { data, isLoading } = useAnalysisData();

    if (isLoading || !data) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-10 bg-gray-200 rounded-lg w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-48 bg-gray-100 rounded-2xl"></div>
                    <div className="h-48 bg-gray-100 rounded-2xl"></div>
                </div>
                <div className="h-96 bg-gray-50 rounded-2xl"></div>
            </div>
        );
    }

    const strategy = data.launch_strategy || {};
    const recommendations = data.strategic_recommendations || '';

    const weeks = [
        { title: 'Week 1: Setup & Branding', content: strategy.week1, icon: 'architecture', color: 'blue' },
        { title: 'Week 2: Soft Launch', content: strategy.week2, icon: 'temp_preferences_eco', color: 'emerald' },
        { title: 'Week 3: Marketing Push', content: strategy.week3, icon: 'campaign', color: 'violet' },
        { title: 'Week 4: Loyalty & Retention', content: strategy.week4, icon: 'loyalty', color: 'rose' },
    ];

    const hasVitals = strategy.hiring_plan || strategy.quick_wins || strategy.menu_tips;

    return (
        <DashboardErrorBoundary>
            <div className="space-y-8 animate-fade-in pb-12">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <span className="material-symbols-outlined text-3xl text-blue-600">rocket_launch</span>
                        Launch Strategy
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        Your step-by-step roadmap to a successful business opening.
                    </p>
                </div>

                {/* Executive Summary/Recommendations */}
                {recommendations && (
                    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
                        <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">psychology</span>
                            <h2 className="font-bold text-blue-900 text-lg">Strategic AI Recommendations</h2>
                        </div>
                        <div className="p-6 md:p-8">
                            <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed">
                                {recommendations.split('\n').map((line, i) => (
                                    <p key={i} className="mb-2 flex items-start gap-3">
                                        <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                                        <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^[-*]\s*/, '') }} />
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 30-Day Roadmap */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">calendar_month</span>
                        The 30-Day Execution Plan
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {weeks.map((week, idx) => (
                            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                <div className={`h-1.5 w-full bg-${week.color}-500/20 group-hover:bg-${week.color}-500 transition-colors`}></div>
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 rounded-xl bg-${week.color}-50 flex items-center justify-center`}>
                                            <span className={`material-symbols-outlined text-${week.color}-600`}>{week.icon}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg">{week.title}</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {week.content ? (
                                            week.content.split('\n').filter(Boolean).map((line, i) => (
                                                <div key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                                                    <span className={`text-${week.color}-400 font-bold mt-0.5 whitespace-nowrap`}>{idx + 1}.{i + 1}</span>
                                                    <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-*]\s*/, '') }} />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-400 italic text-sm">Strategy details being finalized...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vitals Grid */}
                {hasVitals && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Quick Wins */}
                        {strategy.quick_wins && (
                            <div className="lg:col-span-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6">
                                <h3 className="text-amber-900 font-bold flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-amber-600">bolt</span>
                                    Quick Wins (Day 1-7)
                                </h3>
                                <div className="space-y-4">
                                    {strategy.quick_wins.split('\n').filter(Boolean).map((win, i) => (
                                        <div key={i} className="bg-white/60 p-3 rounded-xl border border-amber-200/50 text-sm text-amber-900 font-medium">
                                            {win.replace(/^[-*]\s*/, '')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hiring Plan */}
                        {strategy.hiring_plan && (
                            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-gray-900 font-bold flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-violet-600">group_add</span>
                                    Hiring Roadmap
                                </h3>
                                <div className="space-y-3">
                                    {strategy.hiring_plan.split('\n').filter(Boolean).map((item, i) => (
                                        <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                            <span className="text-violet-400 mt-1">•</span>
                                            {item.replace(/^[-*]\s*/, '')}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Menu/Pricing Tips (Tailored for food businesses) */}
                        {strategy.menu_tips && (
                            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-emerald-500">
                                <h3 className="text-gray-900 font-bold flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-emerald-600">restaurant_menu</span>
                                    Offering Strategy
                                </h3>
                                <div className="space-y-3">
                                    {strategy.menu_tips.split('\n').filter(Boolean).map((tip, i) => (
                                        <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                            <span className="text-emerald-400 mt-1">•</span>
                                            {tip.replace(/^[-*]\s*/, '')}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer CTA */}
                <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h3 className="text-xl font-bold mb-2">Ready to move from strategy to action?</h3>
                            <p className="text-gray-400 text-sm max-w-md">
                                Use our Setup Checklist to track your progress and set your target launch date.
                            </p>
                        </div>
                        <a href="/dashboard/pre-launch" className="px-8 py-3 bg-white text-gray-900 font-black rounded-xl hover:bg-blue-50 transition-colors shadow-lg shadow-white/10 shrink-0">
                            View Setup Checklist
                        </a>
                    </div>
                </div>
            </div>
        </DashboardErrorBoundary>
    );
}
