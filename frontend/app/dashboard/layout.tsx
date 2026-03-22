'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';

const planningLinks = [
    { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
    { href: '/dashboard/pre-launch', label: 'Setup Checklist', icon: 'rule' },
    { href: '/dashboard/strategy', label: 'Launch Strategy', icon: 'rocket_launch' },
    { href: '/dashboard/market', label: 'Market & Demand', icon: 'storefront' },
    { href: '/dashboard/insights', label: 'AI Insights', icon: 'psychology' },
    { href: '/dashboard/revenue', label: 'Revenue Forecast', icon: 'trending_up' },
    { href: '/dashboard/finance', label: 'Financials & Cost', icon: 'payments' },
    { href: '/dashboard/marketing', label: 'Marketing Intel', icon: 'campaign' },
    { href: '/dashboard/schemes', label: 'Govt. Schemes', icon: 'account_balance' },
    { href: '/dashboard/compare', label: 'A/B Compare', icon: 'compare_arrows' },
];

const operationsLinks = [
    { href: '/dashboard/health', label: 'Business Health', icon: 'monitoring', badge: 'Live' },
    { href: '/dashboard/copilot', label: 'COO Copilot (AI)', icon: 'support_agent', badge: 'Beta' },
    { href: '/dashboard/live-pulse', label: 'Live Market Pulse', icon: 'radar' },
    { href: '/dashboard/feedback', label: 'Learning Loop', icon: 'loop' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: analysisData, isLoading } = useAnalysisData();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // If there's no analysis data, redirect back to home
    useEffect(() => {
        if (!isLoading && !analysisData) {
            router.push('/');
        }
    }, [isLoading, analysisData, router]);

    if (isLoading || !analysisData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8]">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
                    <p className="text-gray-500 font-medium">Loading Workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#F5F7FA] overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-gray-200 
                flex flex-col shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Business</h2>
                        <h1 className="text-xl font-bold text-gray-900 truncate" title={analysisData.business_name}>
                            {analysisData.business_name}
                        </h1>
                        <p className="text-sm border text-gray-500 truncate capitalize inline-block mt-1 px-2 py-0.5 rounded bg-gray-50">
                            {analysisData.business_type} • {analysisData.location.split(',')[0]}
                        </p>
                    </div>
                    <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
                    
                    {/* Pre-Launch Phase */}
                    <div>
                        <h3 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            Pre-Launch Setup
                        </h3>
                        <nav className="space-y-1">
                            {planningLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link 
                                        key={link.href} 
                                        href={link.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                            ${isActive 
                                                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                        `}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {link.icon}
                                        </span>
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Post-Launch Phase */}
                    <div>
                        <h3 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Post-Launch Ops
                        </h3>
                        <nav className="space-y-1">
                            {operationsLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link 
                                        key={link.href} 
                                        href={link.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`
                                            flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                            ${isActive 
                                                ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {link.icon}
                                            </span>
                                            {link.label}
                                        </div>
                                        {link.badge && (
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-200/50 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                                {link.badge}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>

                </div>
                
                <div className="p-4 border-t border-gray-100">
                    <Link href="/dashboard/report" className="flex items-center gap-3 px-3 py-3 w-full bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold justify-center transition-colors shadow-md">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Export Full Report
                    </Link>
                    <Link href="/" className="mt-2 flex items-center gap-3 px-3 py-2.5 w-full text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-xl text-sm font-semibold justify-center transition-colors">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back to Home
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F5F7FA]">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-500 hover:bg-gray-50 rounded-lg flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                    <h1 className="font-bold text-gray-900 truncate flex-1">{analysisData.business_name}</h1>
                </header>

                {/* Dashboard Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <DashboardErrorBoundary>
                        <div className="mx-auto max-w-6xl p-4 md:p-8">
                            {children}
                        </div>
                    </DashboardErrorBoundary>
                </main>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E5E7EB;
                    border-radius: 4px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background: #D1D5DB;
                }
            `}</style>
        </div>
    );
}
