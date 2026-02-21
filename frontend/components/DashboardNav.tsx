'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
    { href: '/dashboard/market', label: 'Market & Competition', icon: 'storefront' },
    { href: '/dashboard/insights', label: 'AI Insights', icon: 'psychology' },
    { href: '/dashboard/report', label: 'Report', icon: 'description' },
];

export default function DashboardNav() {
    const pathname = usePathname();

    return (
        <div className="sticky top-16 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E5E5]">
            <div className="max-w-5xl mx-auto px-4 md:px-6">
                <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide" aria-label="Dashboard sections">
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
                                        ? 'border-[#1d73c9] text-[#1d73c9]'
                                        : 'border-transparent text-[#6B7280] hover:text-[#2D2D2D] hover:border-[#E5E5E5]'
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
            </div>
        </div>
    );
}
