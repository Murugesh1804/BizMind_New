'use client';

import { useState, useMemo } from 'react';
import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const formatINR = (v: number | undefined | null) => {
    if (!v && v !== 0) return '₹—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function RevenueForecastPage() {
    const { data, isLoading } = useAnalysisData();
    const [activeScenario, setActiveScenario] = useState<'low' | 'mid' | 'high'>('mid');

    if (isLoading) {
        return <div className="animate-pulse space-y-4 max-w-5xl mx-auto pt-6">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-2xl" />)}
        </div>;
    }

    const rev = data?.revenue_simulation;
    const cb = data?.cost_breakdown;

    if (!data || !rev) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm mx-auto max-w-2xl mt-8">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-3">trending_up</span>
                Revenue forecast data is not available. Please run a new analysis.
            </div>
        );
    }

    const projection = rev.twelve_month_projection ?? [];
    const currentMonthIdx = new Date().getMonth(); // 0-indexed

    // Build month-labeled projection starting from current month
    const monthLabels = projection.map((m: any) => {
        const idx = (currentMonthIdx + m.month - 1) % 12;
        return `${MONTHS[idx]} (M${m.month})`;
    });

    // Select scenario multiplier
    const scenarioMultiplier = activeScenario === 'low' ? 0.7 : activeScenario === 'high' ? 1.5 : 1.0;

    const chartRevData = projection.map((m: any) => Math.round(m.revenue * scenarioMultiplier));
    const chartCostData = projection.map((m: any) => m.costs);
    const chartProfitData = projection.map((m: any, _: any) => Math.round(m.revenue * scenarioMultiplier - m.costs));

    // Cumulative profit for ROI tracking
    let cumulative = -(rev.initial_investment ?? 0);
    const cumulativeData = chartProfitData.map((p: number) => {
        cumulative += p;
        return Math.round(cumulative);
    });

    const barData = {
        labels: monthLabels,
        datasets: [
            {
                label: 'Revenue',
                data: chartRevData,
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderRadius: 6,
                borderSkipped: false,
            },
            {
                label: 'Total Costs',
                data: chartCostData,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderRadius: 6,
                borderSkipped: false,
            },
        ],
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => `${ctx.dataset.label}: ${formatINR(ctx.raw)}`,
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: (v: any) => '₹' + (v >= 100000 ? (v/100000).toFixed(1)+'L' : v.toLocaleString('en-IN')) }
            }
        }
    };

    const breakEvenLine = {
        labels: monthLabels,
        datasets: [
            {
                label: 'Cumulative Profit/Loss (₹)',
                data: cumulativeData,
                borderColor: cumulativeData[cumulativeData.length-1] > 0 ? '#10b981' : '#ef4444',
                backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'transparent';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(16,185,129,0.2)');
                    gradient.addColorStop(1, 'rgba(16,185,129,0)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                pointBackgroundColor: cumulativeData.map((v: number) => v >= 0 ? '#10b981' : '#ef4444'),
                pointRadius: 4,
            }
        ]
    };

    const breakEvenOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => `Cumulative: ${formatINR(ctx.raw)}`,
                }
            }
        },
        scales: {
            y: {
                ticks: { callback: (v: any) => '₹' + (Math.abs(v) >= 100000 ? (v/100000).toFixed(1)+'L' : v.toLocaleString('en-IN')) }
            }
        }
    };

    // Key metrics
    const monthlyRev = rev.monthly_revenue;
    const monthlyProfit = rev.monthly_profit;

    return (
        <DashboardErrorBoundary>
            <div className="animate-fade-in font-sans space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 border-b border-gray-200 pb-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-600 !text-3xl">trending_up</span>
                        Revenue Forecast
                        {rev.tier && (
                            <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wide">
                                {rev.tier} Tier
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm max-w-3xl">
                        Dynamic forecast for <strong>{data.business_type}</strong> in <strong>{data.location}</strong>,  
                        based on real footfall proxies (transit: <strong>{data.transit_count ?? 0}</strong>, 
                        offices: <strong>{data.offices_count ?? 0}</strong>, 
                        apartments: <strong>{data.apartments_count ?? 0}</strong>), 
                        Indian market benchmarks, and competitor demand signals.
                    </p>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Daily Footfall (Est.)', value: `~${rev.daily_footfall ?? 0} customers`, icon: 'groups', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Avg Ticket Size', value: formatINR(rev.avg_ticket), icon: 'receipt', color: 'text-violet-600', bg: 'bg-violet-50' },
                        { label: 'Break-Even', value: rev.break_even_months ? `${rev.break_even_months} months` : 'N/A', icon: 'timer', color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Annual ROI', value: `${rev.roi_pct ?? 0}%`, icon: 'percent', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                                <span className={`material-symbols-outlined ${kpi.color} text-[18px]`}>{kpi.icon}</span>
                            </div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{kpi.label}</p>
                            <p className={`text-xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
                        </div>
                    ))}
                </div>

                {/* Scenario Tabs + Revenue/Profit Cards */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500">bar_chart</span>
                            Revenue Scenarios (Monthly)
                        </h2>
                        <div className="flex gap-2">
                            {(['low', 'mid', 'high'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setActiveScenario(s)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                        activeScenario === s
                                            ? s === 'low' ? 'bg-red-500 text-white border-red-500'
                                            : s === 'mid' ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-emerald-500 text-white border-emerald-500'
                                            : 'bg-white text-gray-600 border-gray-200'
                                    }`}
                                >
                                    {s.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {[
                                { label: 'Revenue', value: monthlyRev[activeScenario], color: 'text-emerald-600' },
                                { label: 'Total Costs', value: (rev.monthly_costs?.total ?? 0), color: 'text-red-500' },
                                { label: 'Net Profit', value: monthlyProfit[activeScenario], color: monthlyProfit[activeScenario] > 0 ? 'text-emerald-600' : 'text-red-600' },
                            ].map((item, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{item.label}</p>
                                    <p className={`text-xl font-black ${item.color}`}>{formatINR(item.value)}</p>
                                    <p className="text-xs text-gray-400">per month</p>
                                </div>
                            ))}
                        </div>

                        <div className="h-64">
                            <Bar data={barData} options={barOptions} />
                        </div>
                    </div>
                </div>

                {/* Break-Even Curve */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">show_chart</span>
                            Cumulative Cash Flow & Break-Even Curve
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            Starts at <strong>-{formatINR(rev.initial_investment)}</strong> (initial investment). 
                            Crosses zero at break-even ({rev.break_even_months ?? '?'} months).
                        </p>
                    </div>
                    <div className="p-6 h-64">
                        <Line data={breakEvenLine} options={breakEvenOptions} />
                    </div>
                </div>

                {/* Cost Breakdown */}
                {rev.monthly_costs && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">payments</span>
                            <h2 className="font-bold text-gray-900">Monthly Cost Breakdown</h2>
                        </div>
                        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(rev.monthly_costs).map(([key, val]) => (
                                key !== 'total' && (
                                    <div key={key} className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1">
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
                                        <p className="text-lg font-black text-gray-900">{formatINR(val as number)}</p>
                                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                            <div
                                                className="h-1 rounded-full bg-orange-400"
                                                style={{ width: `${Math.round(((val as number) / (rev.monthly_costs.total ?? 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400">{Math.round(((val as number) / (rev.monthly_costs.total ?? 1)) * 100)}% of costs</p>
                                    </div>
                                )
                            ))}
                        </div>
                        <div className="px-6 pb-6">
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                                <span className="font-bold text-gray-900">Total Monthly OPEX</span>
                                <span className="text-2xl font-black text-orange-600">{formatINR(rev.monthly_costs.total)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Methodology Note */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
                    <span className="material-symbols-outlined text-blue-500 shrink-0">info</span>
                    <div className="text-sm text-blue-800">
                        <p className="font-bold mb-1">How This Forecast Is Calculated</p>
                        <p className="leading-relaxed">
                            Revenue is computed using a <strong>blended footfall model</strong>:
                            60% from Indian industry benchmarks for {data.business_type} in {rev.tier}-tier cities + 
                            40% from real-world proximity data (apartments: {data.apartments_count ?? 0}, 
                            offices: {data.offices_count ?? 0}, transit: {data.transit_count ?? 0}, 
                            education: {data.education_count ?? 0} nearby).
                            Seasonality curves are applied for Indian festivals and local buying patterns.
                            Costs use city-tier-adjusted rent, labour, and inventory norms for Indian MSMEs.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardErrorBoundary>
    );
}
