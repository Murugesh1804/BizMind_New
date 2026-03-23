'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import Breadcrumbs from '@/components/Breadcrumbs';
import HelpTooltip, { explanations } from '@/components/HelpTooltip';
import Image from 'next/image';

const essentialLinks = [
    { href: '/dashboard', label: 'Overview', icon: 'dashboard', badge: 'Start Here' },
    { href: '/dashboard/market', label: 'Market & Demand', icon: 'storefront' },
    { href: '/dashboard/revenue', label: 'Revenue Forecast', icon: 'trending_up' },
];

const planningLinks = [
    { href: '/dashboard/pre-launch', label: 'Setup Checklist', icon: 'rule' },
    { href: '/dashboard/strategy', label: 'Launch Strategy', icon: 'rocket_launch' },
    { href: '/dashboard/finance', label: 'Financials & Cost', icon: 'payments' },
];

const marketingLinks = [
    { href: '/dashboard/marketing', label: 'Marketing Intel', icon: 'campaign' },
    { href: '/dashboard/insights', label: 'AI Insights', icon: 'psychology' },
];

const toolsLinks = [
    { href: '/dashboard/compare', label: 'A/B Compare', icon: 'compare_arrows' },
    { href: '/dashboard/schemes', label: 'Govt. Schemes', icon: 'account_balance' },
    { href: '/dashboard/health', label: 'Business Health', icon: 'monitoring' },
    { href: '/dashboard/live-pulse', label: 'Live Market Pulse', icon: 'radar' },
    { href: '/dashboard/copilot', label: 'COO Copilot', icon: 'support_agent', badge: 'AI' },
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
                {/* Logo Area */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex-1 flex justify-center md:justify-start">
                        <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg p-1">
                            <Image src="/favicon.ico" alt="BizMind" width={120} height={120} className="h-10 md:h-12 w-auto" />
                        </Link>
                    </div>
                </div>

                <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Business</h2>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate" title={analysisData.business_name}>
                            {analysisData.business_name}
                        </h1>
                        <p className="text-xs md:text-sm border text-gray-500 truncate capitalize inline-block mt-1 px-2 py-0.5 rounded bg-gray-50">
                            {analysisData.business_type} • {analysisData.location.split(',')[0]}
                        </p>
                    </div>
                    <button className="lg:hidden text-gray-400 hover:text-gray-600 p-1" onClick={() => setSidebarOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar">
                    
                    {/* Essentials - Start Here */}
                    <div>
                        <h3 className="px-3 text-[11px] font-bold text-blue-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Essentials
                        </h3>
                        <nav className="space-y-1">
                            {essentialLinks.map((link: { href: string; label: string; icon: string; badge?: string }) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link 
                                        key={link.href} 
                                        href={link.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`
                                            flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                            ${isActive 
                                                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                                                {link.icon}
                                            </span>
                                            {link.label}
                                        </div>
                                        {link.badge && (
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-200/50 text-blue-800' : 'bg-blue-100 text-blue-600'}`}>
                                                {link.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Planning */}
                    <div>
                        <h3 className="px-3 text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Planning
                        </h3>
                        <nav className="space-y-1">
                            {planningLinks.map((link: { href: string; label: string; icon: string; badge?: string }) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link 
                                        key={link.href} 
                                        href={link.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`
                                            flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                            ${isActive 
                                                ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-100/50' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-amber-600' : 'text-gray-400'}`}>
                                                {link.icon}
                                            </span>
                                            {link.label}
                                        </div>
                                        {link.badge && (
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isActive ? 'bg-amber-200/50 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                                                {link.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Marketing */}
                    <div>
                        <h3 className="px-3 text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                            Marketing
                        </h3>
                        <nav className="space-y-1">
                            {marketingLinks.map((link: { href: string; label: string; icon: string; badge?: string }) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link 
                                        key={link.href} 
                                        href={link.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`
                                            flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                            ${isActive 
                                                ? 'bg-violet-50 text-violet-700 shadow-sm border border-violet-100/50' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-violet-600' : 'text-gray-400'}`}>
                                                {link.icon}
                                            </span>
                                            {link.label}
                                        </div>
                                        {link.badge && (
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isActive ? 'bg-violet-200/50 text-violet-800' : 'bg-gray-100 text-gray-500'}`}>
                                                {link.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tools - Collapsible */}
                    <div className="pt-2 border-t border-gray-100">
                        <h3 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            Advanced Tools
                        </h3>
                        <nav className="space-y-1">
                            {toolsLinks.map((link: { href: string; label: string; icon: string; badge?: string }) => {
                                const isActive = pathname === link.href;
                                const isCOOCopilot = link.href === '/dashboard/copilot';
                                return (
                                    <Link 
                                        key={link.href} 
                                        href={link.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`
                                            flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
                                            ${isActive 
                                                ? 'bg-gray-100 text-gray-900 shadow-sm' 
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                                                {link.icon}
                                            </span>
                                            {isCOOCopilot ? (
                                                <HelpTooltip term="COO Copilot" explanation={explanations.cooCopilot}>
                                                    <span className="flex items-center gap-1">
                                                        COO Copilot
                                                        <span className="material-symbols-outlined text-[14px] text-gray-400">help_outline</span>
                                                    </span>
                                                </HelpTooltip>
                                            ) : (
                                                link.label
                                            )}
                                        </div>
                                        {link.badge && (
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isActive ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {link.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
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
                <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
                    <DashboardErrorBoundary>
                        <div className="mx-auto max-w-6xl p-4 md:p-8">
                            <Breadcrumbs />
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
