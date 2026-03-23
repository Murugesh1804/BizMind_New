'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const tabs = [
    { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
    { href: '/dashboard/market', label: 'Market & Competition', icon: 'storefront' },
    { href: '/dashboard/insights', label: 'AI Insights', icon: 'psychology' },
    { href: '/dashboard/finance', label: 'Financials', icon: 'account_balance_wallet' },
    { href: '/dashboard/schemes', label: 'Govt. Schemes', icon: 'account_balance' },
    { href: '/dashboard/compare', label: 'Compare', icon: 'compare' },
    { href: '/dashboard/report', label: 'Report', icon: 'description' },
];

export default function DashboardNav() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="sticky top-16 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 md:px-6">
                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide" aria-label="Dashboard sections">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`
                                    flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap
                                    border-b-2 transition-all duration-200
                                    ${isActive
                                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                                    }
                                `}
                            >
                                <span
                                    className={`material-symbols-outlined transition-colors`}
                                    style={{ fontSize: '18px', fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Mobile Nav */}
                <div className="md:hidden">
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold"
                    >
                        <span>{tabs.find(t => t.href === pathname)?.label || 'Menu'}</span>
                        <span className="material-symbols-outlined">{isMobileMenuOpen ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {isMobileMenuOpen && (
                        <div className="py-2">
                            {tabs.map((tab) => (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-md ${pathname === tab.href ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{tab.icon}</span>
                                    {tab.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
