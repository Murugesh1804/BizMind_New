'use client';

import { useState } from 'react';
import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import type { GovScheme } from '@/lib/types';

// Central government hardcoded schemes (always applicable)
const CENTRAL_SCHEMES: GovScheme[] = [
    {
        name: 'PM Mudra Yojana (PMMY)',
        description: 'Collateral-free business loans for non-corporate, non-farm enterprises. Shishu (up to ₹50K), Kishore (₹50K–5L), Tarun (₹5L–10L). No processing fee.',
        url: 'https://www.mudra.org.in/',
        category: 'Finance',
    },
    {
        name: 'Startup India',
        description: 'Tax exemptions, fast-track patent registration, and DPIIT recognition for eligible startups. Get access to ₹10,000 Cr Fund of Funds.',
        url: 'https://www.startupindia.gov.in/',
        category: 'Startup',
    },
    {
        name: 'PM SVANidhi (Street Vendor Loans)',
        description: 'Micro-credit loans up to ₹50,000 for street vendors and small traders. Includes digital payment rewards and insurance benefits.',
        url: 'https://pmsvanidhi.mohua.gov.in/',
        category: 'Finance',
    },
    {
        name: 'Udyam Registration (MSME)',
        description: 'Free online registration for Micro, Small & Medium Enterprises. Unlocks government tenders, subsidies, priority sector loans, and credit guarantee coverage.',
        url: 'https://udyamregistration.gov.in/',
        category: 'Registration',
    },
    {
        name: 'Credit Guarantee Fund Trust (CGTMSE)',
        description: 'Collateral-free loan coverage up to ₹2 crore for MSMEs. Reduces risk for both borrower and bank. Apply through any scheduled commercial bank.',
        url: 'https://www.cgtmse.in/',
        category: 'Finance',
    },
    {
        name: 'GeM Portal (Government e-Marketplace)',
        description: 'Sell your products/services directly to government departments. MSMEs get 25% reservation and easier onboarding process.',
        url: 'https://gem.gov.in/',
        category: 'Sales',
    },
    {
        name: 'PM Vishwakarma Kaushal Samman',
        description: 'Skill training, credit support and market linkage for artisans and craftspeople. Up to ₹3 lakh credit at 5% interest rate.',
        url: 'https://pmvishwakarma.gov.in/',
        category: 'Skill',
    },
    {
        name: 'PMFME – PM Formalisation of Micro Food Enterprises',
        description: 'Credit-linked subsidy of 35% (up to ₹10 lakh) for making micro food processing units compliant with FSSAI, branding and packaging.',
        url: 'https://pmfme.mofpi.gov.in/',
        category: 'Food',
    },
];

const CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
    Finance:     { text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
    Startup:     { text: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
    Registration:{ text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
    Sales:       { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    Skill:       { text: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
    Food:        { text: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
    State:       { text: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200' },
};

const HOW_TO_APPLY = [
    { step: 1, title: 'Get Udyam Registered', desc: 'First get MSME registration at udyamregistration.gov.in — it\'s free and takes 10 minutes. All schemes require this.', icon: 'how_to_reg' },
    { step: 2, title: 'Choose the Right Scheme', desc: 'Pick 1-2 schemes most relevant to your business type and funding needs. Don\'t apply for everything at once.', icon: 'checklist' },
    { step: 3, title: 'Prepare Documents', desc: 'Keep ready: Aadhaar, PAN, GST certificate, bank statements (6 months), and a brief business plan/project report.', icon: 'folder_open' },
    { step: 4, title: 'Visit Nearest Branch/Portal', desc: 'For loans: visit PSU bank branches (SBI, Bank of Baroda). For subsidies: apply via the scheme\'s official portal.', icon: 'location_on' },
    { step: 5, title: 'Follow Up', desc: 'Track application status online. For MUDRA loans, loan processing takes 15-30 days once documents are complete.', icon: 'track_changes' },
];

function SchemeCard({ scheme, isScraped }: { scheme: GovScheme; isScraped?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const cat = scheme.category ?? 'Finance';
    const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['Finance'];

    return (
        <div className={`bg-white rounded-xl border ${colors.border} shadow-sm hover:shadow-md transition-all overflow-hidden`}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${colors.text} ${colors.bg}`}>
                                {isScraped ? '🌐 State/Local' : `📋 ${cat}`}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-[15px] leading-snug">{scheme.name}</h3>
                    </div>
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${colors.bg} ${colors.text}`}
                    >
                        <span className="material-symbols-outlined text-[16px]" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                            expand_more
                        </span>
                    </button>
                </div>

                {!expanded && (
                    <p className="text-gray-500 text-sm mt-2 line-clamp-2">{scheme.description}</p>
                )}

                {expanded && (
                    <div className="mt-3 space-y-3 animate-fade-in">
                        <p className="text-gray-700 text-sm leading-relaxed">{scheme.description}</p>
                        <a
                            href={scheme.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-sm font-semibold ${colors.text} hover:underline`}
                        >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            How to Apply → {scheme.url.replace('https://', '').split('/')[0]}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

// Filter schemes by business type relevance
function getRelevantSchemes(businessType: string, allSchemes: GovScheme[]): GovScheme[] {
    const bt = businessType.toLowerCase();
    // Add Food category for food-related businesses
    const tagged = allSchemes.map(s => {
        if (s.category === 'Food' && !['food', 'restaurant', 'cafe', 'bakery', 'dhaba', 'tiffin'].some(k => bt.includes(k))) {
            return null; // hide food-specific schemes for non-food
        }
        return s;
    }).filter(Boolean) as GovScheme[];
    return tagged;
}

export default function SchemesPage() {
    const { data, isLoading } = useAnalysisData();
    const [activeFilter, setActiveFilter] = useState<string>('All');

    if (isLoading) {
        return <div className="animate-pulse space-y-4 max-w-5xl mx-auto pt-6">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl w-full" />)}
        </div>;
    }

    if (!data) return null;

    // Scraped/API schemes from the analysis
    const scrapedSchemes: GovScheme[] = (data.gov_schemes_list ?? []).filter(
        (s: GovScheme) => s.name !== 'Mudra Loan (PMMY)' && s.name !== 'PMFME Scheme'
    );

    // Relevant central schemes based on business type
    const centralSchemes = getRelevantSchemes(data.business_type, CENTRAL_SCHEMES);

    const allCategories = ['All', ...Array.from(new Set(centralSchemes.map(s => s.category ?? 'Finance')))];

    const filteredCentral = activeFilter === 'All' ? centralSchemes : centralSchemes.filter(s => s.category === activeFilter);

    return (
        <DashboardErrorBoundary>
            <div className="animate-fade-in font-sans space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 border-b border-gray-200 pb-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600 !text-3xl">account_balance</span>
                        Government Schemes & Funding
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm max-w-3xl">
                        Central & State schemes relevant for <strong>{data.business_type}</strong> in <strong>{data.location}</strong>.
                        These are real programs you can apply for through official portals.
                    </p>
                </div>

                {/* How To Apply Strip */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
                    <h2 className="font-bold text-lg mb-5 flex items-center gap-2 relative z-10">
                        <span className="material-symbols-outlined text-blue-300">route</span>
                        How To Apply — Step by Step
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
                        {HOW_TO_APPLY.map((step) => (
                            <div key={step.step} className="flex flex-col gap-2">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-300 text-[20px]">{step.icon}</span>
                                </div>
                                <p className="font-bold text-sm">{step.step}. {step.title}</p>
                                <p className="text-blue-200 text-xs leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Central Schemes Column */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Category Filter Tabs */}
                        <div className="flex gap-2 flex-wrap">
                            {allCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveFilter(cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                        activeFilter === cat
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">flag</span>
                                Central Government Schemes ({filteredCentral.length})
                            </h2>
                            <div className="space-y-3">
                                {filteredCentral.map((scheme, i) => (
                                    <SchemeCard key={i} scheme={scheme} />
                                ))}
                            </div>
                        </div>

                        {/* Scraped State Schemes */}
                        {scrapedSchemes.length > 0 && (
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">public</span>
                                    State & Location-Specific Schemes ({scrapedSchemes.length})
                                </h2>
                                <div className="space-y-3">
                                    {scrapedSchemes.map((scheme, i) => (
                                        <SchemeCard key={i} scheme={{ ...scheme, category: 'State' }} isScraped />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Quick Tips */}
                    <div className="space-y-5">
                        {/* Document Checklist */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="bg-amber-50 px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-600">folder_open</span>
                                <h3 className="font-bold text-gray-900 text-sm">Documents Needed</h3>
                            </div>
                            <div className="p-5 space-y-2">
                                {[
                                    'Aadhaar Card (Proprietor/Director)',
                                    'PAN Card (Business + Personal)',
                                    'GST Registration Certificate',
                                    'Bank Passbook/Statement (6 months)',
                                    'Udyam Registration Certificate',
                                    'Project Report / Business Plan',
                                    'Shop & Establishment License',
                                    'Trade License (Municipal)',
                                    'FSSAI License (for food businesses)',
                                ].map((doc, i) => (
                                    <div key={i} className="flex items-start gap-2.5 text-sm">
                                        <span className="material-symbols-outlined text-emerald-500 text-[16px] mt-0.5 shrink-0">check_circle</span>
                                        <span className="text-gray-700">{doc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Tip */}
                        <div className="bg-emerald-900 text-white rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-emerald-300">tips_and_updates</span>
                                <h3 className="font-bold text-sm">Pro Tip</h3>
                            </div>
                            <p className="text-emerald-100 text-sm leading-relaxed">
                                Apply for <strong>Udyam Registration first</strong> — it takes 10 minutes and unlocks nearly
                                every scheme below. Many state subsidies require proof of Udyam registration before
                                processing your application.
                            </p>
                            <a
                                href="https://udyamregistration.gov.in/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-emerald-300 hover:text-white transition-colors"
                            >
                                Register Now → udyamregistration.gov.in
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </a>
                        </div>

                        {/* Bank Contacts */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500 text-[18px]">account_balance</span>
                                Priority Banks for MSME Loans
                            </h3>
                            {[
                                { bank: 'SBI', scheme: 'SBI Simplified Small Business Loan', phone: '1800-11-2211' },
                                { bank: 'Bank of Baroda', scheme: 'BOB Baroda MSME Loan', phone: '1800-258-4455' },
                                { bank: 'Canara Bank', scheme: 'Canara MSME – Pragati', phone: '1800-425-0018' },
                            ].map((b, i) => (
                                <div key={i} className="py-3 border-b border-gray-50 last:border-0">
                                    <p className="font-semibold text-gray-800 text-sm">{b.bank}</p>
                                    <p className="text-gray-500 text-xs">{b.scheme}</p>
                                    <a href={`tel:${b.phone}`} className="text-blue-600 text-xs font-medium hover:underline">
                                        📞 {b.phone}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardErrorBoundary>
    );
}
