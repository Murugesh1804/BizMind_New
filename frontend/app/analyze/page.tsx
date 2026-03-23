'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { analyze, preview } from '@/lib/api';
import type { PreviewResult, TopCompetitor } from '@/lib/types';
import { useAutosave, checkExistingDraft, clearDraft } from '@/lib/useAutosave';
import AnalysisLoader from '@/components/AnalysisLoader';
import { ScoreBreakdown, DataFreshnessBadge, PrivacyBadge } from '@/components/TrustIndicators';
import { MobileMapModal, CompetitorDetailView } from '@/components/Phase4Improvements';

declare global {
  interface Window {
    google: any;
    initBizMindMap: () => void;
  }
}

export default function AnalyzePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('cafe');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [budget, setBudget] = useState('');
  const [radius, setRadius] = useState('1000');
  const [ownerType, setOwnerType] = useState<'new' | 'existing'>('new');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Analysis state
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState('');
  const [error, setError] = useState('');

  // UI state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [competitorDetailOpen, setCompetitorDetailOpen] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    const draft = checkExistingDraft();
    if (draft) {
      setDraftData(draft);
      setShowRecoveryModal(true);
    }
  }, []);

  useAutosave({
    businessName, businessType, customBusinessType, budget,
    location: selectedLocation, latitude, longitude, radius, ownerType, selectedLocation,
  }, !submitting);

  // Load Google Maps
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    window.initBizMindMap = initMap;
    if (!document.getElementById('gmaps-script')) {
      const script = document.createElement('script');
      script.id = 'gmaps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization&callback=initBizMindMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (window.google?.maps) {
      initMap();
    }
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return;
    const defaultCenter = { lat: 13.0827, lng: 80.2707 };
    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter, zoom: 13,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    });
    mapInstanceRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();

    if (searchInputRef.current && window.google.maps.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ['geometry', 'formatted_address', 'name'],
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setLocationOnMap(lat, lng, place.formatted_address || place.name);
          map.setCenter({ lat, lng });
          map.setZoom(15);
        }
      });
    }

    map.addListener('click', (e: any) => {
      setLocationOnMap(e.latLng.lat(), e.latLng.lng());
      setPreviewData(null);
      setHasPreviewed(false);
    });
  };

  const setLocationOnMap = (lat: number, lng: number, address?: string) => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;
    if (markerRef.current) markerRef.current.setMap(null);
    if (circleRef.current) circleRef.current.setMap(null);

    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng }, map,
      animation: window.google.maps.Animation.DROP,
    });
    circleRef.current = new window.google.maps.Circle({
      map, center: { lat, lng }, radius: parseInt(radius) || 1000,
      fillColor: '#1d73c9', fillOpacity: 0.15,
      strokeColor: '#1d73c9', strokeOpacity: 0.8, strokeWeight: 2,
    });
    setLatitude(String(lat));
    setLongitude(String(lng));

    if (address) {
      setSelectedLocation(address);
    } else {
      geocoderRef.current?.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        const addr = status === 'OK' && results[0] ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setSelectedLocation(addr);
      });
    }
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocationOnMap(lat, lng);
      mapInstanceRef.current?.setCenter({ lat, lng });
      mapInstanceRef.current?.setZoom(15);
    });
  };

  // ─── Run Quick Preview ──────────────────────────────────────────────────────
  const handlePreview = async () => {
    const finalType = businessType === 'other' ? customBusinessType : businessType;
    if (!finalType.trim()) { setPreviewError('Please select or enter your business type.'); return; }
    if (!latitude) { setPreviewError('Please select a location on the map.'); return; }
    if (!businessName.trim()) { setPreviewError('Please enter your business name.'); return; }

    setPreviewError('');
    setPreviewing(true);
    try {
      const result: PreviewResult = await preview({
        business_type: finalType,
        location: selectedLocation,
        latitude, longitude, radius: parseInt(radius),
      });
      setPreviewData(result);
      setHasPreviewed(true);
    } catch (err: any) {
      setPreviewError(err?.response?.data?.message || 'Preview failed. Try again.');
    } finally {
      setPreviewing(false);
    }
  };

  // ─── Generate Full Report (Single Click) ────────────────────────────────────
  const handleFullReport = async () => {
    if (!businessName.trim()) { setError('Please enter your business name.'); return; }
    if (!latitude) { setError('Please select a location on the map.'); return; }

    setError('');
    setSubmitting(true);
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    setCurrentTaskId(taskId);

    try {
      const finalType = businessType === 'other' ? customBusinessType : businessType;
      const formData = new FormData();
      formData.append('task_id', taskId);
      formData.append('business_name', businessName);
      formData.append('business_type', finalType);
      formData.append('location', selectedLocation);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('radius', radius);
      formData.append('owner_type', ownerType);
      formData.append('budget', budget);

      const data = await analyze(formData);
      sessionStorage.setItem('analysisResult', JSON.stringify(data));
      clearDraft();
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Analysis failed. Please try again.';
      setError(msg);
      setSubmitting(false);
    }
  };

  // Combined action: Preview first, then auto-offer full report
  const handleAnalyze = async () => {
    if (!hasPreviewed) {
      await handlePreview();
    } else {
      await handleFullReport();
    }
  };

  const handleCancelAnalysis = () => {
    setSubmitting(false);
    setCurrentTaskId('');
  };

  const handleRecoverDraft = () => {
    if (draftData) {
      setBusinessName(draftData.businessName || '');
      setBusinessType(draftData.businessType || 'cafe');
      setCustomBusinessType(draftData.customBusinessType || '');
      setBudget(draftData.budget || '');
      setSelectedLocation(draftData.selectedLocation || '');
      setLatitude(draftData.latitude || '');
      setLongitude(draftData.longitude || '');
      setRadius(draftData.radius || '1000');
      setOwnerType(draftData.ownerType || 'new');
    }
    setShowRecoveryModal(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowRecoveryModal(false);
  };

  const handleTryDifferentLocation = () => {
    setPreviewData(null);
    setHasPreviewed(false);
    if (markerRef.current) markerRef.current.setMap(null);
    if (circleRef.current) circleRef.current.setMap(null);
    setSelectedLocation('');
    setLatitude('');
    setLongitude('');
  };

  const finalType = businessType === 'other' ? customBusinessType : businessType;
  const canAnalyze = businessName.trim() && finalType.trim() && latitude;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-20 pb-12">
      {submitting && <AnalysisLoader businessName={businessName} taskId={currentTaskId} onCancel={handleCancelAnalysis} />}

      {/* Recovery Modal */}
      {showRecoveryModal && draftData && (
        <div className="fixed inset-0 z-[200] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600">restore</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Resume Your Analysis?</h3>
                <p className="text-sm text-gray-500">We saved your progress</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
              {draftData.businessName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Business:</span>
                  <span className="font-medium text-gray-900">{draftData.businessName}</span>
                </div>
              )}
              {draftData.selectedLocation && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Location:</span>
                  <span className="font-medium text-gray-900 truncate max-w-[200px]">{draftData.selectedLocation}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleRecoverDraft} className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl transition-colors">
                Continue
              </button>
              <button onClick={handleDiscardDraft} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors">
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Map Modal */}
      <MobileMapModal
        isOpen={mobileMapOpen}
        onClose={() => setMobileMapOpen(false)}
        onLocationSelect={(lat, lng, address) => {
          setLatitude(String(lat));
          setLongitude(String(lng));
          setSelectedLocation(address);
        }}
        mapRef={mapRef}
      />

      {/* Competitor Detail View */}
      {competitorDetailOpen && previewData?.top_competitors && (
        <CompetitorDetailView
          competitors={previewData.top_competitors}
          onClose={() => setCompetitorDetailOpen(false)}
          businessType={finalType}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary mb-4">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            AI-Powered Location Intelligence
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3">
            Analyze Your <span className="text-primary">Business Location</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Enter your business details, pick a location on the map, and get instant AI-powered insights.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-3 border-b border-gray-100">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                Business Details
              </div>

              {/* Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Business Name</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="e.g. Blue Coffee"
                />
              </div>

              {/* Business Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Business Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                >
                  <option value="cafe">Cafe / Coffee Shop</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="grocery">Grocery / Supermarket</option>
                  <option value="retail">Retail / Electronics</option>
                  <option value="clothing">Clothing / Apparel</option>
                  <option value="salon">Salon / Beauty Parlour</option>
                  <option value="gym">Gym / Fitness Center</option>
                  <option value="pharmacy">Pharmacy / Medical Store</option>
                  <option value="bakery">Bakery / Sweet Shop</option>
                  <option value="other">Other...</option>
                </select>
                {businessType === 'other' && (
                  <input
                    value={customBusinessType}
                    onChange={(e) => setCustomBusinessType(e.target.value)}
                    className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-amber-400 mt-2"
                    placeholder="Specify business type"
                  />
                )}
              </div>

              {/* Experience */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Experience</label>
                <div className="flex p-1 bg-gray-100 rounded-xl">
                  {(['new', 'existing'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setOwnerType(type)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        ownerType === type ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {type === 'new' ? 'New Founder' : 'Experienced'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Budget (₹)</label>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  type="number"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="e.g. 500000"
                />
              </div>

              <PrivacyBadge />
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || previewing || submitting}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold py-4 px-6 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {previewing ? (
                <><span className="material-symbols-outlined animate-spin">refresh</span> Analyzing...</>
              ) : hasPreviewed ? (
                <><span className="material-symbols-outlined">analytics</span> Generate Full Report</>
              ) : (
                <><span className="material-symbols-outlined">radar</span> Analyze Location</>
              )}
            </button>

            {previewError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {previewError}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Secondary Action */}
            {hasPreviewed && (
              <button
                onClick={handleTryDifferentLocation}
                className="w-full py-3 px-4 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">location_searching</span>
                Try Different Location
              </button>
            )}
          </div>

          {/* Right: Map & Results */}
          <div className="lg:col-span-8 space-y-4">
            {/* Map Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  Select Location
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={radius}
                    onChange={(e) => {
                      setRadius(e.target.value);
                      if (circleRef.current) circleRef.current.setRadius(parseInt(e.target.value));
                    }}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="500">500m radius</option>
                    <option value="1000">1km radius</option>
                    <option value="2000">2km radius</option>
                    <option value="5000">5km radius</option>
                  </select>
                  <button
                    onClick={handleMyLocation}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                    title="Use my location"
                  >
                    <span className="material-symbols-outlined text-lg">my_location</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  ref={searchInputRef}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Search for a location..."
                />
              </div>

              {/* Map */}
              <div className="h-[350px] md:h-[400px] rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                <div ref={mapRef} className="w-full h-full" />
              </div>

              {/* Selected Location */}
              {selectedLocation && (
                <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                  <p className="text-sm text-emerald-800 font-medium truncate">{selectedLocation}</p>
                </div>
              )}

              {/* Mobile Map Button */}
              <button
                onClick={() => setMobileMapOpen(true)}
                className="lg:hidden w-full mt-3 py-2.5 bg-gray-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">fullscreen</span>
                Open Full-Screen Map
              </button>
            </div>

            {/* Preview Results - Inline */}
            {previewData && hasPreviewed && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">preview</span>
                    <span className="font-bold text-gray-900">Quick Preview Results</span>
                  </div>
                  <DataFreshnessBadge timestamp={new Date()} />
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-3 divide-x divide-gray-200">
                  <div className="p-4 text-center">
                    <p className="text-2xl font-extrabold text-orange-600">{previewData.competitor_count}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Competitors</p>
                    <p className="text-xs text-orange-600 mt-0.5">{previewData.competition_level}</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-extrabold text-amber-600">{previewData.avg_rating}★</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Avg Rating</p>
                    <p className="text-xs text-amber-600 mt-0.5">{previewData.demand_level} demand</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-extrabold text-emerald-600">{previewData.customer_score}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Customer Score</p>
                    <p className="text-xs text-emerald-600 mt-0.5">/100</p>
                  </div>
                </div>

                {/* AI Opinion */}
                <div className="px-5 py-4 bg-blue-50/60 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">AI Opinion</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{previewData.ai_opinion}</p>
                </div>

                {/* Top Competitors */}
                {previewData.top_competitors?.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-200">
                    <button
                      onClick={() => setCompetitorDetailOpen(true)}
                      className="flex items-center justify-between w-full group text-left"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Top {previewData.top_competitors.length} Competitors Nearby
                      </span>
                      <span className="text-primary text-sm group-hover:underline">View All →</span>
                    </button>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {previewData.top_competitors.slice(0, 3).map((c: TopCompetitor, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs">
                          <span className="truncate max-w-[120px]">{c.name}</span>
                          <span className="text-amber-600 font-bold">{c.rating}★</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
