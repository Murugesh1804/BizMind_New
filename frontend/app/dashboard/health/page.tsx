'use client';
import { useState, useEffect } from 'react';
import { useAnalysisData } from '@/lib/hooks';
import { submitBusinessMetric, getBusinessMetrics } from '@/lib/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatINR = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function BusinessHealthPage() {
    const { data: analysisData, isLoading: analysisLoading } = useAnalysisData();
    const [metrics, setMetrics] = useState<any[]>([]);
    const [loadingMetrics, setLoadingMetrics] = useState(true);
    
    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [revenue, setRevenue] = useState('');
    const [expenses, setExpenses] = useState('');
    const [customers, setCustomers] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const fetchMetrics = async () => {
        if (!analysisData?.id) return;
        try {
            setLoadingMetrics(true);
            const res = await getBusinessMetrics(analysisData.id, 30);
            if (res.metrics) {
                // Sort chronologically for chart
                const sorted = [...res.metrics].sort((a: any, b: any) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );
                setMetrics(sorted);
            }
        } catch (err) {
            console.error('[BusinessHealth] fetchMetrics failed:', err);
        } finally {
            setLoadingMetrics(false);
        }
    };

    useEffect(() => {
        if (analysisData) fetchMetrics();
    }, [analysisData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!analysisData?.id) return;
        
        setError('');
        setSuccessMsg('');
        setSubmitting(true);
        
        try {
            await submitBusinessMetric({
                analysis_id: analysisData.id,
                date,
                daily_revenue: Number(revenue),
                daily_expenses: Number(expenses),
                customer_count: Number(customers),
                notes
            });
            
            setSuccessMsg('✅ Metrics saved successfully!');
            setRevenue('');
            setExpenses('');
            setCustomers('');
            setNotes('');
            
            await fetchMetrics();
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setError(err?.response?.data?.error ?? 'Failed to save metrics. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Computed summary stats
    const totalRevenue = metrics.reduce((s, m) => s + (m.daily_revenue ?? 0), 0);
    const totalExpenses = metrics.reduce((s, m) => s + (m.daily_expenses ?? 0), 0);
    const avgCustomers = metrics.length ? Math.round(metrics.reduce((s, m) => s + (m.customer_count ?? 0), 0) / metrics.length) : 0;
    const netProfit = totalRevenue - totalExpenses;

    // Chart Data
    const labels = metrics.map(m => new Date(m.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    const revenueData = metrics.map(m => m.daily_revenue ?? 0);
    const expensesData = metrics.map(m => m.daily_expenses ?? 0);
    const profitData = metrics.map(m => (m.daily_revenue ?? 0) - (m.daily_expenses ?? 0));

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Revenue (₹)',
                data: revenueData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#10b981',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Expenses (₹)',
                data: expensesData,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointBackgroundColor: '#ef4444',
                tension: 0.4,
            },
            {
                label: 'Profit (₹)',
                data: profitData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderWidth: 2,
                pointBackgroundColor: profitData.map(v => v >= 0 ? '#6366f1' : '#ef4444'),
                tension: 0.4,
                fill: false,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const, labels: { font: { size: 11 } } },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    label: (ctx: any) => ` ${ctx.dataset.label}: ₹${(ctx.raw ?? 0).toLocaleString('en-IN')}`,
                }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: (v: any) => '₹' + v.toLocaleString('en-IN') }
            }
        }
    };

    if (analysisLoading) {
        return <div className="animate-pulse h-96 bg-gray-100 rounded-2xl w-full" />;
    }

    return (
        <div className="space-y-8 animate-fade-in font-sans">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900 border-b border-gray-200 pb-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-500">monitoring</span>
                    Business Health Dashboard
                </h1>
                <p className="text-gray-500 mt-2 text-sm max-w-2xl">
                    Log your daily operations to track actual performance against AI projections. Consistency builds the most powerful dataset for your business.
                </p>
            </div>

            {/* Summary KPIs - shown when we have data */}
            {metrics.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Revenue', value: formatINR(totalRevenue), icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Total Expenses', value: formatINR(totalExpenses), icon: 'receipt', color: 'text-red-500', bg: 'bg-red-50' },
                        { label: 'Net Profit', value: formatINR(netProfit), icon: 'account_balance_wallet', color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
                        { label: 'Avg Daily Customers', value: `${avgCustomers}`, icon: 'groups', color: 'text-blue-600', bg: 'bg-blue-50' },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                                <span className={`material-symbols-outlined ${kpi.color} text-[18px]`}>{kpi.icon}</span>
                            </div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{kpi.label}</p>
                            <p className={`text-xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Last {metrics.length} days</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Data Input */}
                <div className="lg:col-span-1 border border-gray-200 bg-white rounded-2xl shadow-sm p-6 lg:p-8 h-fit sticky top-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500 text-[20px]">edit_square</span>
                        Log Daily Metrics
                    </h2>
                    
                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>}
                    {successMsg && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">{successMsg}</div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                            <input 
                                type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Revenue (₹)</label>
                                <input 
                                    type="number" required placeholder="0" min="0" value={revenue} onChange={(e) => setRevenue(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Expenses (₹)</label>
                                <input 
                                    type="number" required placeholder="0" min="0" value={expenses} onChange={(e) => setExpenses(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Customer Count / Orders</label>
                            <input 
                                type="number" required placeholder="e.g. 45" min="0" value={customers} onChange={(e) => setCustomers(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                            <textarea 
                                placeholder="Weather was bad, ran promotion..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm"
                            />
                        </div>
                        
                        <button 
                            type="submit" disabled={submitting}
                            className="w-full py-3.5 mt-2 rounded-xl font-bold bg-gray-900 hover:bg-black text-white transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {submitting ? (
                                <><span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> Saving...</>
                            ) : (
                                <><span className="material-symbols-outlined text-[20px]">save</span> Save Metrics</>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Column: Analytics */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Visual Chart */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500 text-[20px]">show_chart</span>
                            30-Day Financial Trend
                        </h2>
                        {loadingMetrics ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">refresh</span>
                            </div>
                        ) : metrics.length > 0 ? (
                            <div className="h-72 w-full">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">show_chart</span>
                                <p className="font-medium">No data logged yet.</p>
                                <p className="text-sm mt-1">Submit your first day's metrics using the form.</p>
                            </div>
                        )}
                    </div>

                    {/* Log Table */}
                    {metrics.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-500 text-[18px]">table_rows</span>
                                    Daily Log ({metrics.length} entries)
                                </h2>
                                <span className="text-xs text-gray-400 font-medium">Latest first</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Revenue</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Expenses</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Profit</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Customers</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...metrics].reverse().map((m, i) => {
                                            const profit = (m.daily_revenue ?? 0) - (m.daily_expenses ?? 0);
                                            return (
                                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-800">
                                                        {new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatINR(m.daily_revenue)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-red-500">{formatINR(m.daily_expenses)}</td>
                                                    <td className={`px-4 py-3 text-right font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {profit >= 0 ? '+' : ''}{formatINR(profit)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-600">{m.customer_count ?? '—'}</td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{m.notes || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
