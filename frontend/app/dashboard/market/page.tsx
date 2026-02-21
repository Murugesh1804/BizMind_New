'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { useAuth } from '@/context/AuthContext';
import DashboardNav from '@/components/DashboardNav';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

declare global { interface Window { google: any; } }

const TH = { fontFamily: "'Tiempos Headline', 'Playfair Display', serif" };

function LevelBadge({ value, thresholds }: { value: string; thresholds?: boolean }) {
    const color = value === 'High'
        ? 'bg-red-50 text-red-700 border-red-200'
        : value === 'Moderate' || value === 'Medium'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return (
        <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${color}`}>{value}</span>
    );
}

function CustomerPillar({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}/10`}>
                <span className={`material-symbols-outlined ${color}`} style={{ fontSize: '20px' }}>{icon}</span>
            </div>
            <span className="text-2xl font-bold text-[#2D2D2D]" style={TH}>{value}</span>
            <span className="text-[10px] text-[#6B7280] font-medium text-center leading-tight">{label}</span>
        </div>
    );
}

export default function MarketPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [data, setData] = useState<any>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapsLoaded = useRef(false);

    useEffect(() => {
        if (!isLoading && !user) { router.push('/login'); return; }
        const raw = sessionStorage.getItem('analysisResult');
        if (!raw) { router.push('/'); return; }
        setData(JSON.parse(raw));
    }, [isLoading, user, router]);

    useEffect(() => {
        if (!data || !mapRef.current || mapsLoaded.current) return;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        const initHeatmap = () => {
            if (!window.google || !mapRef.current) return;
            mapsLoaded.current = true;
            const lat = parseFloat(data.latitude || '13.0827');
            const lng = parseFloat(data.longitude || '80.2707');
            const map = new window.google.maps.Map(mapRef.current!, {
                center: { lat, lng }, zoom: 14,
                mapTypeId: 'roadmap', mapTypeControl: false, streetViewControl: false,
            });
            const heatPoints = (data.heatmap_data || []).map((p: any) =>
                new window.google.maps.LatLng(p.lat, p.lng)
            );
            new (window.google.maps as any).visualization.HeatmapLayer({
                data: heatPoints, map, radius: 25, opacity: 0.8,
            });
            new window.google.maps.Marker({
                position: { lat, lng }, map, title: data.business_name,
                animation: window.google.maps.Animation.DROP,
            });
        };
        if (!document.getElementById('gmaps-script-dash')) {
            const script = document.createElement('script');
            script.id = 'gmaps-script-dash';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
            script.onload = initHeatmap;
            document.head.appendChild(script);
        } else if (window.google?.maps) { initHeatmap(); }
    }, [data]);

    if (!data || isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F9F9F8]">
                <span className="material-symbols-outlined text-6xl text-[#1d73c9] animate-spin">refresh</span>
                <p className="text-[#6B7280] font-medium">Loading market data…</p>
            </div>
        );
    }

    const features = data.features || {};
    const competitors = data.competitors || [];
    const barData = {
        labels: competitors.slice(0, 8).map((c: any) => c.name?.substring(0, 16) || 'Unknown'),
        datasets: [{
            label: 'Rating',
            data: competitors.slice(0, 8).map((c: any) => parseFloat(c.rating) || 0),
            backgroundColor: '#1d73c9bb',
            borderRadius: 8,
        }],
    };

    return (
        <div className="pt-16">
            <DashboardNav />
            <main className="pt-6 pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-8" style={{ fontFamily: 'Inter, sans-serif' }}>

                {/* Page title */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#2D2D2D]" style={TH}>Market &amp; Competition</h1>
                        <p className="text-sm text-[#6B7280] mt-0.5">{data.location} · {data.radius}m radius</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <LevelBadge value={features.competition_level ?? 'N/A'} />
                        <span className="text-xs text-[#6B7280]">Competition</span>
                        <div className="w-px h-4 bg-[#E5E5E5]" />
                        <LevelBadge value={features.demand_level ?? 'N/A'} />
                        <span className="text-xs text-[#6B7280]">Demand</span>
                    </div>
                </div>

                {/* Customer base pillars */}
                <section className="bg-white rounded-xl border border-[#E5E5E5] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold text-[#2D2D2D]" style={TH}>Customer Base Indicators</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#1d73c9]" style={TH}>{data.customer_score}/100</span>
                            <span className="text-xs text-[#6B7280]">Customer Score</span>
                        </div>
                    </div>
                    {/* Score bar */}
                    <div className="mb-6">
                        <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#1d73c9] rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(data.customer_score, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-1">
                            <span>Low</span><span>High</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 divide-x divide-[#F3F4F6]">
                        <CustomerPillar icon="apartment" label="Residential" value={data.apartments_count ?? 0} color="text-[#1d73c9]" />
                        <div className="pl-4 flex-1 flex gap-4">
                            <CustomerPillar icon="school" label="Education Centers" value={data.education_count ?? 0} color="text-violet-500" />
                        </div>
                        <div className="pl-4 flex-1 flex gap-4">
                            <CustomerPillar icon="business" label="Office Spaces" value={data.offices_count ?? 0} color="text-emerald-500" />
                        </div>
                        <div className="pl-4 flex-1 flex gap-4">
                            <CustomerPillar icon="directions_bus" label="Transit Stops" value={data.transit_count ?? 0} color="text-orange-500" />
                        </div>
                    </div>
                </section>

                {/* Competitors grid + bar chart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Competitor cards */}
                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-[#2D2D2D]" style={TH}>
                            Nearby Competitors
                            <span className="ml-2 text-xs font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                                {competitors.length} found
                            </span>
                        </h2>
                        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                            {competitors.slice(0, 10).map((c: any, i: number) => (
                                <div key={i}
                                    className="bg-white rounded-xl border border-[#E5E5E5] p-4 hover:border-[#1d73c9]/25 hover:shadow-sm transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-[#F9F9F8] border border-[#E5E5E5] flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[#6B7280]" style={{ fontSize: '16px' }}>store</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-bold text-sm text-[#2D2D2D] truncate">{c.name}</p>
                                                {c.rating && (
                                                    <span className="shrink-0 flex items-center gap-0.5 bg-yellow-50 border border-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>star</span>
                                                        {parseFloat(c.rating).toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#6B7280] mt-0.5 truncate">{c.address}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                {c.distance_km && (
                                                    <span className="text-[10px] text-[#9CA3AF] flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>near_me</span>
                                                        {c.distance_km} km
                                                    </span>
                                                )}
                                                {c.reviews_count > 0 && (
                                                    <span className="text-[10px] text-[#9CA3AF] flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>rate_review</span>
                                                        {c.reviews_count.toLocaleString()} reviews
                                                    </span>
                                                )}
                                                {c.website && (
                                                    <a href={c.website} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-[#1d73c9] flex items-center gap-0.5 hover:underline">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>language</span>
                                                        Website
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Bar chart */}
                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-[#2D2D2D]" style={TH}>Competitor Ratings</h2>
                        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                            <Bar data={barData} options={{
                                indexAxis: 'y' as const,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { min: 0, max: 5, grid: { color: '#F3F4F6' }, ticks: { font: { size: 11 } } },
                                    y: { grid: { display: false }, ticks: { font: { size: 11 } } },
                                },
                            }} />
                        </div>
                        {/* avg vs area annotation */}
                        {data.avg_competitor_rating && (
                            <div className="bg-[#F9F9F8] rounded-xl border border-[#E5E5E5] p-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#1d73c9]" style={{ fontSize: '20px' }}>equalizer</span>
                                <div>
                                    <p className="text-sm font-bold text-[#2D2D2D]">Area Average Rating</p>
                                    <p className="text-xs text-[#6B7280]">
                                        {parseFloat(data.avg_competitor_rating).toFixed(2)} ★ across {data.competitors_count} competitors
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Heatmap */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-[#2D2D2D]" style={TH}>Customer Density Heatmap</h2>
                        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#1d73c9]" /> High
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB]" /> Low
                            </span>
                        </div>
                    </div>
                    <div ref={mapRef} className="w-full h-96 rounded-xl bg-[#F9F9F8] border border-[#E5E5E5]" />
                </section>

            </main>
        </div>
    );
}
