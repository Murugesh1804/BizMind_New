'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getHistory, getAnalysis, deleteAnalysis, downloadJSON } from '@/lib/api';
import type { HistoryEntry, AnalysisResult } from '@/lib/types';



function ScoreColor(score: number) {
    if (score >= 7) return 'text-emerald-600 bg-emerald-50';
    if (score >= 5) return 'text-amber-600 bg-amber-50';
    return 'text-red-500 bg-red-50';
}

export default function HistoryPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [analyses, setAnalyses] = useState<HistoryEntry[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detail, setDetail] = useState<AnalysisResult | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getHistory(page);
            setAnalyses(data.analyses || []);
            setTotalPages(data.total_pages || 1);
        } catch {
            // handled by axios interceptor for 401
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        if (!isLoading && !user) { router.push('/login'); return; }
        if (user) fetchHistory();
    }, [user, isLoading, fetchHistory, router]);

    const openDetail = async (id: number) => {
        setSelectedId(id);
        setDetailLoading(true);
        setDetail(null);
        try {
            const data = await getAnalysis(id);
            setDetail(data.analysis);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this analysis?')) return;
        setDeletingId(id);
        try {
            await deleteAnalysis(id);
            setAnalyses((prev) => prev.filter((a) => a.id !== id));
            if (selectedId === id) setSelectedId(null);
        } finally {
            setDeletingId(null);
        }
    };

    const handleViewDashboard = (analysis: AnalysisResult) => {
        sessionStorage.setItem('analysisResult', JSON.stringify(analysis));
        router.push('/dashboard');
    };

    return (
        <main className="pt-24 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Analysis History</h1>
                    <p className="text-gray-500 mt-1">Your past business location analyses</p>
                </div>
                <button onClick={() => router.push('/')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-lg transition-all">
                    <span className="material-symbols-outlined !text-base">add</span>New Analysis
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <span className="material-symbols-outlined text-5xl text-primary animate-spin">refresh</span>
                </div>
            ) : analyses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <span className="material-symbols-outlined text-6xl text-gray-300">history</span>
                    <p className="text-gray-500 font-medium">No analyses yet. Start your first one!</p>
                    <button onClick={() => router.push('/')}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all">
                        Analyze a Location
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {analyses.map((a) => (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="bg-primary/10 size-10 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined !text-lg text-primary">storefront</span>
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ScoreColor(a.success_score)}`}>
                                    Score: {a.success_score}/10
                                </span>
                            </div>
                            <h3 className="font-extrabold text-gray-900 text-base">{a.business_name}</h3>
                            <p className="text-sm text-gray-500 capitalize">{a.business_type}</p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined !text-xs">location_on</span>{a.location}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined !text-xs">schedule</span>
                                {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => openDetail(a.id)}
                                    className="flex-1 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all">
                                    View Details
                                </button>
                                <button onClick={() => downloadJSON(a.id, a.business_name)}
                                    className="p-2 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all" title="Download JSON">
                                    <span className="material-symbols-outlined !text-base">download</span>
                                </button>
                                <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}
                                    className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50">
                                    <span className="material-symbols-outlined !text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-all">
                        ← Prev
                    </button>
                    <span className="px-4 py-2 text-sm font-bold text-gray-600">
                        {page} / {totalPages}
                    </span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-all">
                        Next →
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-extrabold text-gray-900">
                                {detailLoading ? 'Loading...' : detail?.business_name}
                            </h2>
                            <div className="flex gap-2">
                                {detail && (
                                    <button onClick={() => handleViewDashboard(detail)}
                                        className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-all">
                                        View Dashboard
                                    </button>
                                )}
                                <button onClick={() => setSelectedId(null)}
                                    className="size-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all">
                                    <span className="material-symbols-outlined !text-lg">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            {detailLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <span className="material-symbols-outlined text-3xl text-primary animate-spin">refresh</span>
                                </div>
                            ) : detail ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { l: 'Business', v: detail.business_name },
                                            { l: 'Type', v: detail.business_type },
                                            { l: 'Location', v: detail.location },
                                            { l: 'Success Score', v: `${detail.success_score}/10` },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-gray-50 rounded-xl p-3">
                                                <p className="text-xs uppercase tracking-wider font-bold text-gray-400">{item.l}</p>
                                                <p className="text-sm font-bold text-gray-900 mt-0.5">{item.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {detail.market_analysis && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-2">Market Analysis</p>
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{detail.market_analysis}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center">Failed to load details.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
