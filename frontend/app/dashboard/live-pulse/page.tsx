'use client';
import { useState, useEffect } from 'react';
import { useAnalysisData } from '@/lib/hooks';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';

export default function LiveMarketPulsePage() {
    const { data, isLoading } = useAnalysisData();
    const [pulseData, setPulseData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate real-time market pulse data
        const fetchPulseData = async () => {
            setLoading(true);
            try {
                // Mock data for now - in real app this would come from API
                const mockData = [
                    { 
                        id: 1, 
                        type: 'competitor', 
                        message: 'New cafe "Brew & Bite" opened 500m away', 
                        time: '2 hours ago', 
                        impact: 'medium',
                        location: data?.location || 'Your area'
                    },
                    { 
                        id: 2, 
                        type: 'market', 
                        message: 'Foot traffic increased by 15% this week', 
                        time: '1 day ago', 
                        impact: 'positive',
                        location: data?.location || 'Your area'
                    },
                    { 
                        id: 3, 
                        type: 'trend', 
                        message: 'Local demand for artisanal coffee rising', 
                        time: '3 days ago', 
                        impact: 'positive',
                        location: data?.location || 'Your area'
                    },
                ];
                setPulseData(mockData);
            } catch (error) {
                console.error('Failed to fetch pulse data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (data) {
            fetchPulseData();
        }
    }, [data]);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-10 bg-gray-200 rounded-lg w-1/3"></div>
                <div className="space-y-4">
                    <div className="h-24 bg-gray-100 rounded-xl"></div>
                    <div className="h-24 bg-gray-100 rounded-xl"></div>
                    <div className="h-24 bg-gray-100 rounded-xl"></div>
                </div>
            </div>
        );
    }

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'positive': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'negative': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'competitor': return 'storefront';
            case 'market': return 'trending_up';
            case 'trend': return 'insights';
            default: return 'info';
        }
    };

    return (
        <DashboardErrorBoundary>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <span className="material-symbols-outlined text-3xl text-orange-500">radar</span>
                        Live Market Pulse
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        Real-time market intelligence for {data?.business_name || 'your business'} location.
                    </p>
                </div>

                {/* Live Status */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border border-orange-200 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="font-bold text-orange-900">Live Monitoring Active</span>
                        </div>
                        <span className="text-sm text-orange-700">
                            Last updated: {new Date().toLocaleTimeString()}
                        </span>
                    </div>
                </div>

                {/* Pulse Feed */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">notifications</span>
                        Market Intelligence Feed
                    </h2>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : pulseData.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl">
                            <span className="material-symbols-outlined text-4xl text-gray-300">radar</span>
                            <p className="text-gray-500 mt-2">No market activity detected yet</p>
                            <p className="text-sm text-gray-400 mt-1">We'll notify you of important changes</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pulseData.map((item) => (
                                <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getImpactColor(item.impact)}`}>
                                            <span className="material-symbols-outlined">{getIcon(item.type)}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.message}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs">location_on</span>
                                                            {item.location}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs">schedule</span>
                                                            {item.time}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getImpactColor(item.impact)}`}>
                                                    {item.impact}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined">settings</span>
                        Alert Preferences
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: 'New competitors', description: 'Get notified when new businesses open nearby', enabled: true },
                            { label: 'Market trends', description: 'Track changes in customer demand and preferences', enabled: true },
                            { label: 'Price changes', description: 'Monitor pricing changes in your area', enabled: false },
                        ].map((setting, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{setting.label}</p>
                                    <p className="text-sm text-gray-500">{setting.description}</p>
                                </div>
                                <button
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        setting.enabled ? 'bg-primary' : 'bg-gray-200'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            setting.enabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardErrorBoundary>
    );
}
