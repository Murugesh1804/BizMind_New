'use client';

import { useState, useEffect } from 'react';
import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import { getHistory, compareLocations } from '@/lib/api';

function formatINR(value: number | null | undefined) {
    if (!value) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function ScoreBadge({ score }: { score: number }) {
    const cls = score >= 7 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : score >= 4 ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-red-700 bg-red-50 border-red-200';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
            {score >= 7 ? '✅' : score >= 4 ? '⚡' : '⚠️'} {score.toFixed(1)}/10
        </span>
    );
}

function CompareRow({ label, a, b, icon, format = 'text', higherIsBetter = true }: {
    label: string; a: any; b: any; icon: string; format?: 'inr' | 'text' | 'months'; higherIsBetter?: boolean;
}) {
    const valA = typeof a === 'number' ? a : 0;
    const valB = typeof b === 'number' ? b : 0;
    let winA = false, winB = false;
    if (typeof a === 'number' && typeof b === 'number' && a !== b) {
        if (higherIsBetter) { winA = a > b; winB = b > a; }
        else { winA = a < b; winB = b < a; }
    }

    const displayVal = (val: any) => {
        if (format === 'inr') return formatINR(val);
        if (format === 'months') return val ? `${val} months` : 'N/A';
        return String(val ?? 'N/A');
    };

    return (
        <div className="grid grid-cols-12 items-center gap-2 py-3 border-b border-gray-50">
            <div className="col-span-4 flex items-center gap-2 text-sm text-gray-600">
                <span className="material-symbols-outlined text-gray-400 text-[16px]">{icon}</span>
                <span className="font-medium">{label}</span>
            </div>
            <div className={`col-span-4 text-center font-semibold text-sm rounded-lg py-1 transition-all ${winA ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'text-gray-800'}`}>
                {winA && <span className="mr-1">🏆</span>}
                {displayVal(a)}
            </div>
            <div className={`col-span-4 text-center font-semibold text-sm rounded-lg py-1 transition-all ${winB ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'text-gray-800'}`}>
                {winB && <span className="mr-1">🏆</span>}
                {displayVal(b)}
            </div>
        </div>
    );
}

export default function ComparePage() {
    const { data: currentAnalysis, isLoading } = useAnalysisData();
    const [history, setHistory] = useState<any[]>([]);
    const [selectedIdA, setSelectedIdA] = useState<number | ''>('');
    const [selectedIdB, setSelectedIdB] = useState<number | ''>('');
    const [comparing, setComparing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getHistory(1, 30)
            .then(res => {
                const analyses = res.analyses ?? [];
                setHistory(analyses);
                // Pre-select current analysis as A if available
                if (currentAnalysis?.id) {
                    const found = analyses.find((a: any) => a.id === currentAnalysis.id);
                    if (found) setSelectedIdA(currentAnalysis.id);
                }
            })
            .catch(console.error);
    }, [currentAnalysis]);

    const handleCompare = async () => {
        if (!selectedIdA || !selectedIdB) {
            setError('Please select two analyses to compare.');
            return;
        }
        if (selectedIdA === selectedIdB) {
            setError('Please select two different analyses.');
            return;
        }
        setError('');
        setComparing(true);
        setResult(null);
        try {
            const res = await compareLocations(Number(selectedIdA), Number(selectedIdB));
            setResult(res);
        } catch (err: any) {
            setError(err?.response?.data?.error ?? 'Comparison failed. Please try again.');
        } finally {
            setComparing(false);
        }
    };

    if (isLoading) {
        return <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
        </div>;
    }

    return (
        <DashboardErrorBoundary>
            <div className="animate-fade-in font-sans space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 border-b border-gray-200 pb-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600 !text-3xl">compare_arrows</span>
                        A/B Location Comparison
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm max-w-3xl">
                        Compare two saved analyses side by side — scores, revenue projections, costs, and AI verdict.
                        Pick any two from your history.
                    </p>
                </div>

                {/* Selector */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">tune</span>
                        Select Two Analyses
                    </h2>

                    {history.length < 2 && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm mb-4 flex items-start gap-3">
                            <span className="material-symbols-outlined text-amber-500 shrink-0">info</span>
                            <p>You need at least <strong>2 saved analyses</strong> to compare. Run another analysis from home to unlock this feature.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                📍 Location A
                            </label>
                            <select
                                value={selectedIdA}
                                onChange={e => setSelectedIdA(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select an analysis...</option>
                                {history.map((h: any) => (
                                    <option key={h.id} value={h.id}>
                                        {h.business_name} — {h.location} (Score: {h.success_score})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                📍 Location B
                            </label>
                            <select
                                value={selectedIdB}
                                onChange={e => setSelectedIdB(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select an analysis...</option>
                                {history.map((h: any) => (
                                    <option key={h.id} value={h.id}>
                                        {h.business_name} — {h.location} (Score: {h.success_score})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>
                    )}

                    <button
                        onClick={handleCompare}
                        disabled={comparing || !selectedIdA || !selectedIdB || history.length < 2}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {comparing ? (
                            <><span className="material-symbols-outlined animate-spin">refresh</span> Comparing...</>
                        ) : (
                            <><span className="material-symbols-outlined">compare_arrows</span> Run Comparison</>
                        )}
                    </button>
                </div>

                {/* Results */}
                {result && (
                    <div className="space-y-6 animate-fade-in">

                        {/* Verdict Banner */}
                        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
                            <div className="relative z-10 flex items-start gap-4">
                                <span className="material-symbols-outlined text-yellow-400 text-5xl">emoji_events</span>
                                <div>
                                    <p className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-1">AI Verdict</p>
                                    <p className="text-xl font-black leading-tight">{result.recommendation}</p>
                                    <p className="text-blue-200 text-sm mt-2">
                                        Based on success score, projected revenue, competition, and break-even analysis.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Side-by-Side Headers */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-12 gap-2 px-6 py-4 bg-gray-50 border-b border-gray-100">
                                <div className="col-span-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Metric</div>
                                <div className="col-span-4 text-center">
                                    <p className="font-bold text-gray-900 text-sm">{result.location_a?.business_name}</p>
                                    <p className="text-gray-500 text-xs truncate">{result.location_a?.location}</p>
                                    <div className="mt-1"><ScoreBadge score={result.location_a?.success_score ?? 0} /></div>
                                </div>
                                <div className="col-span-4 text-center">
                                    <p className="font-bold text-gray-900 text-sm">{result.location_b?.business_name}</p>
                                    <p className="text-gray-500 text-xs truncate">{result.location_b?.location}</p>
                                    <div className="mt-1"><ScoreBadge score={result.location_b?.success_score ?? 0} /></div>
                                </div>
                            </div>

                            <div className="px-6 py-2">
                                <CompareRow label="Success Score" a={result.location_a?.success_score} b={result.location_b?.success_score} icon="star" />
                                <CompareRow label="Location Tier" a={result.location_a?.location_tier} b={result.location_b?.location_tier} icon="location_city" higherIsBetter={false} />
                                <CompareRow label="Competition Level" a={result.location_a?.competition_level} b={result.location_b?.competition_level} icon="storefront" higherIsBetter={false} />
                                <CompareRow label="Demand Level" a={result.location_a?.demand_level} b={result.location_b?.demand_level} icon="trending_up" />
                                <CompareRow label="Avg Competitor Rating" a={result.location_a?.avg_rating} b={result.location_b?.avg_rating} icon="star_rate" />
                                <CompareRow label="Customer Score" a={result.location_a?.customer_score} b={result.location_b?.customer_score} icon="groups" />
                                <CompareRow label="Monthly Rent" a={result.location_a?.monthly_rent} b={result.location_b?.monthly_rent} icon="home" format="inr" higherIsBetter={false} />
                                <CompareRow label="Monthly Revenue (Mid)" a={result.location_a?.monthly_revenue_mid} b={result.location_b?.monthly_revenue_mid} icon="payments" format="inr" />
                                <CompareRow label="Monthly Profit (Mid)" a={result.location_a?.monthly_profit_mid} b={result.location_b?.monthly_profit_mid} icon="account_balance_wallet" format="inr" />
                                <CompareRow label="Break-Even Period" a={result.location_a?.break_even_months} b={result.location_b?.break_even_months} icon="timer" format="months" higherIsBetter={false} />
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { loc: result.location_a, label: 'A', color: 'border-blue-200 bg-blue-50' },
                                { loc: result.location_b, label: 'B', color: 'border-purple-200 bg-purple-50' },
                            ].map(({ loc, label, color }) => (
                                <div key={label} className={`bg-white rounded-2xl border shadow-sm overflow-hidden`}>
                                    <div className={`${color} px-5 py-3 border-b`}>
                                        <p className="font-bold text-gray-900 text-sm">Location {label}: {loc?.business_name}</p>
                                        <p className="text-gray-500 text-xs">{loc?.location} — {loc?.location_tier} Tier</p>
                                    </div>
                                    <div className="p-5 space-y-3 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-500">Monthly Revenue</span><span className="font-bold text-gray-900">{formatINR(loc?.monthly_revenue_mid)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Monthly Profit</span><span className={`font-bold ${(loc?.monthly_profit_mid ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatINR(loc?.monthly_profit_mid)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Monthly Rent</span><span className="font-bold text-orange-600">{formatINR(loc?.monthly_rent)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Break-Even</span><span className="font-bold text-gray-900">{loc?.break_even_months ? `${loc.break_even_months} months` : 'N/A'}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardErrorBoundary>
    );
}
