'use client';

import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';

export default function FinancePage() {
    const { data, isLoading } = useAnalysisData();

    if (isLoading) {
        return <div className="animate-pulse space-y-6 max-w-5xl mx-auto pt-6"><div className="h-64 bg-gray-200 rounded-2xl w-full"></div><div className="h-64 bg-gray-200 rounded-2xl w-full"></div></div>;
    }

    if (!data || !data.cost_breakdown || !data.revenue_simulation) {
        return <div className="p-8 text-center text-gray-500 font-medium bg-white rounded-2xl border border-gray-100 shadow-sm mx-auto max-w-2xl mt-8">Financial data is not available for this analysis. Please run a new analysis.</div>;
    }

    const { cost_breakdown: cb, revenue_simulation: rev } = data;

    const formatINR = (value: number) => {
        if (!value) return '₹0';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
    };

    return (
        <DashboardErrorBoundary>
            <main className="pt-6 pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-8" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 border-b border-gray-200 pb-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600 !text-3xl">account_balance_wallet</span>
                        Financial Analysis & Simulation
                    </h1>
                </div>
                
                {/* Highlights Bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Break-Even</span>
                        <span className="text-2xl font-black text-gray-900 mt-2">{rev.break_even_months ? `${rev.break_even_months} Months` : 'N/A'}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Estimated ROI</span>
                        <span className="text-2xl font-black text-emerald-600 mt-2">{rev.roi_pct || 0}% / yr</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Avg Ticket Size</span>
                        <span className="text-2xl font-black text-blue-600 mt-2">{formatINR(rev.avg_ticket || 0)}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Daily Footfall</span>
                        <span className="text-2xl font-black text-indigo-600 mt-2">~{rev.daily_footfall || 0}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Cost Breakdown */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500">payments</span>
                                    Initial & Monthly Costs
                                </h2>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{cb.tier} Tier</span>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">One-Time Setup Costs</h3>
                                    <div className="space-y-3">
                                        {Object.entries(cb.one_time_costs || {}).map(([key, val]) => (
                                            <div key={key} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                                <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                                <span className="font-semibold text-gray-900">{formatINR(val as number)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center text-sm font-bold pt-2">
                                            <span className="text-gray-800">Total Capital Required</span>
                                            <span className="text-gray-900">{formatINR(Object.values(cb.one_time_costs || {}).reduce((a:any, b:any) => a + b, 0))}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recurring Monthly OPEX</h3>
                                    <div className="space-y-3">
                                        {Object.entries(rev.monthly_costs || cb.monthly_costs || {}).map(([key, val]) => (
                                            <div key={key} className={`flex justify-between items-center text-sm border-b border-gray-50 pb-2 ${key === 'total' ? 'font-bold border-t border-gray-200 pt-2 text-gray-900' : 'text-gray-600'}`}>
                                                <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                                                <span className="">{formatINR(val as number)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Simulation */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-sm overflow-hidden relative">
                            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl mix-blend-screen"></div>
                            
                            <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between z-10 relative">
                                <h2 className="font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-300">trending_up</span>
                                    Profitability Scenarios
                                </h2>
                            </div>
                            
                            <div className="p-6 space-y-6 relative z-10">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Low</span>
                                        <span className="block text-lg font-bold text-gray-200">{formatINR(rev.monthly_profit?.low)}</span>
                                        <span className="block text-[10px] text-gray-500 mt-1">/mo</span>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 shadow-lg transform scale-105">
                                        <span className="block text-[10px] text-blue-300 font-bold uppercase tracking-wider mb-1">Expected (Mid)</span>
                                        <span className="block text-xl font-black text-emerald-400">{formatINR(rev.monthly_profit?.mid)}</span>
                                        <span className="block text-[10px] text-gray-300 mt-1">/mo profit</span>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">High</span>
                                        <span className="block text-lg font-bold text-gray-200">{formatINR(rev.monthly_profit?.high)}</span>
                                        <span className="block text-[10px] text-gray-500 mt-1">/mo</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">First-Year Cash Flow Estimate</h3>
                                    <div className="h-32 flex items-end gap-1 px-2">
                                        {rev.twelve_month_projection?.map((m: any, i: number) => {
                                            const maxRev = Math.max(...rev.twelve_month_projection.map((x:any)=>x.revenue));
                                            const revH = Math.max(10, Math.round((m.revenue / maxRev) * 100)) + '%';
                                            const costH = Math.max(10, Math.round((m.costs / maxRev) * 100)) + '%';
                                            return (
                                                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group relative">
                                                    <div className="absolute bottom-full mb-2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                        Month {m.month}: {formatINR(m.profit)} profit
                                                    </div>
                                                    <div className="w-full bg-orange-400/50 rounded-t-sm" style={{ height: costH, opacity: 0.8 }}></div>
                                                    <div className="w-full bg-emerald-400 rounded-t-sm -mt-full mix-blend-screen" style={{ height: revH }}></div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-2 px-1">
                                        <span>Month 1</span>
                                        <span>Month 6</span>
                                        <span>Month 12</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
                            <span className="material-symbols-outlined text-blue-500">info</span>
                            <p className="text-sm text-blue-800 leading-relaxed">
                                The simulation above is dynamically generated based on <strong>footfall proxies</strong> ({cb.tier} tier density, nearby transit points) and historic benchmark expenses for your industry. Real-world results will vary based on execution and daily marketing consistency.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </DashboardErrorBoundary>
    );
}
