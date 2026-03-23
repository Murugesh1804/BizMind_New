'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const breadcrumbNames: Record<string, string> = {
    '/dashboard': 'Overview',
    '/dashboard/pre-launch': 'Setup Checklist',
    '/dashboard/strategy': 'Launch Strategy',
    '/dashboard/market': 'Market & Demand',
    '/dashboard/insights': 'AI Insights',
    '/dashboard/revenue': 'Revenue Forecast',
    '/dashboard/finance': 'Financials & Cost',
    '/dashboard/marketing': 'Marketing Intel',
    '/dashboard/schemes': 'Govt. Schemes',
    '/dashboard/compare': 'A/B Compare',
    '/dashboard/health': 'Business Health',
    '/dashboard/copilot': 'COO Copilot',
    '/dashboard/live-pulse': 'Live Market Pulse',
    '/dashboard/feedback': 'Learning Loop',
    '/dashboard/report': 'Report',
};

export default function Breadcrumbs() {
    const pathname = usePathname();
    
    if (!pathname.startsWith('/dashboard')) return null;
    
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Build breadcrumb trail
    let currentPath = '';
    for (let i = 0; i < pathSegments.length; i++) {
        currentPath += '/' + pathSegments[i];
        const name = breadcrumbNames[currentPath] || pathSegments[i];
        
        breadcrumbs.push({
            name,
            href: currentPath,
            isLast: i === pathSegments.length - 1,
        });
    }

    return (
        <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
            <Link 
                href="/" 
                className="hover:text-primary transition-colors flex items-center gap-1"
            >
                <span className="material-symbols-outlined text-base">home</span>
                Home
            </Link>
            
            {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center space-x-1">
                    <span className="text-gray-300">/</span>
                    {crumb.isLast ? (
                        <span className="text-gray-900 font-medium">{crumb.name}</span>
                    ) : (
                        <Link 
                            href={crumb.href}
                            className="hover:text-primary transition-colors"
                        >
                            {crumb.name}
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    );
}
