'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { analyze, preview } from '@/lib/api';
import type { PreviewResult } from '@/lib/types';
import AnalysisLoader from '@/components/AnalysisLoader';

declare global {
  interface Window {
    google: any;
    initBizMindMap: () => void;
  }
}

// ─── Phase type ───────────────────────────────────────────────────────────────
type Phase = 'explore' | 'decision' | 'ab_compare' | 'locking';

export default function AnalyzePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Form
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('cafe');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('1000');
  const [ownerType, setOwnerType] = useState<'new' | 'existing'>('new');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Phase 1 preview state
  const [phase, setPhase] = useState<Phase>('explore');
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState('');

  // Phase 2 — lock / AB
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
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
      // Reset preview when user clicks a new location
      setPreviewData(null);
      setPhase('explore');
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
      fillColor: '#137fec', fillOpacity: 0.15,
      strokeColor: '#137fec', strokeOpacity: 0.8, strokeWeight: 2,
    });
    setLatitude(String(lat));
    setLongitude(String(lng));

    if (address) {
      setSelectedLocation(address);
      setLocation(address);
    } else {
      geocoderRef.current?.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        const addr = status === 'OK' && results[0] ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setSelectedLocation(addr);
        setLocation(addr);
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

  // ─── Phase 1: Run quick preview ──────────────────────────────────────────────
  const handlePreview = async () => {
    const finalType = businessType === 'other' ? customBusinessType : businessType;
    if (!finalType.trim()) { setPreviewError('Please select or enter your business type first.'); return; }
    if (!latitude) { setPreviewError('Please click a location on the map.'); return; }
    if (!businessName.trim()) { setPreviewError('Please enter your business name.'); return; }
    setPreviewError('');
    setPreviewing(true);
    try {
      const result: PreviewResult = await preview({
        business_type: finalType,
        location: selectedLocation || location,
        latitude, longitude, radius: parseInt(radius),
      });
      setPreviewData(result);
      setPhase('decision');
    } catch (err: any) {
      setPreviewData(null);
      setPreviewError(err?.response?.data?.message || 'Preview failed. Try again.');
    } finally {
      setPreviewing(false);
    }
  };

  // Change marker to green when locked
  const lockLocation = () => {
    if (markerRef.current && window.google) {
      markerRef.current.setIcon({
        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
      });
    }
    setPhase('locking');
    handleFullAnalysis();
  };

  const handleFullAnalysis = async () => {
    if (!businessName.trim()) { setError('Please enter your business name.'); return; }
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
      formData.append('location', selectedLocation || location);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('radius', radius);
      formData.append('owner_type', ownerType);
      formData.append('budget', budget);
      const data = await analyze(formData);
      sessionStorage.setItem('analysisResult', JSON.stringify(data));
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Analysis failed. Please try again.';
      setError(msg);
      setSubmitting(false);
      setPhase('decision');
    }
  };

  const tryDifferentLocation = () => {
    setPhase('ab_compare');
    setPreviewData(null);
    if (markerRef.current) markerRef.current.setMap(null);
    if (circleRef.current) circleRef.current.setMap(null);
    setSelectedLocation('');
    setLatitude('');
    setLongitude('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-primary animate-spin">refresh</span>
      </div>
    );
  }

  const fmtInr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  return (
    <>
      {(submitting || phase === 'locking') && <AnalysisLoader businessName={businessName} taskId={currentTaskId} />}

      <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans">
        {/* Abstract Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-[120px] pointer-events-none" />

        <main className="relative z-10 pt-28 md:pt-36 pb-24 px-4 md:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* Left Column */}
          <div className="lg:col-span-5 flex flex-col gap-10 animate-fade-in">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>auto_awesome</span>
                AI-Powered Location Intelligence
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-gray-900">
                Make Smarter <br />
                <span className="text-primary">Business Decisions</span> with AI
              </h1>
              <p className="text-lg text-gray-500 font-medium max-w-lg leading-relaxed">
                Preview any location instantly — see competitor density, customer scores, and an AI opinion before you commit.
              </p>
            </div>

            {/* How it works steps */}
            <div className="flex flex-col space-y-1">
              {[
                { step: 1, icon: 'edit_note', title: 'Define Your Business', desc: 'Enter type, name, experience level' },
                { step: 2, icon: 'radar', title: 'Get Quick Preview', desc: 'See competitors + AI opinion instantly' },
                { step: 3, icon: 'lock', title: 'Lock Location', desc: 'Commit to unlock all 9 full features' },
                { step: 4, icon: 'insights', title: 'Full AI Analysis', desc: 'Revenue forecast, strategy, marketing plan' },
              ].map((step, i) => {
                const isActive = 
                  (step.step === 1 && phase === 'explore') ||
                  (step.step === 2 && (phase === 'decision' || phase === 'ab_compare')) ||
                  (step.step === 3 && phase === 'locking') ||
                  (step.step === 4 && submitting);
                
                const isPast = 
                  (step.step === 1 && phase !== 'explore') ||
                  (step.step === 2 && (phase === 'locking' || submitting)) ||
                  (step.step === 3 && submitting);

                return (
                <div key={i} className={`flex gap-5 transition-opacity duration-300 ${isActive || isPast ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="flex flex-col items-center">
                    <div className={`size-12 rounded-xl flex items-center justify-center border shadow-sm transition-colors ${
                      isActive ? 'bg-primary/10 text-primary border-primary/20 ring-2 ring-primary/20'
                      : isPast ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}>
                      <span className="material-symbols-outlined !text-xl">{isPast ? 'check' : step.icon}</span>
                    </div>
                    {i < 3 && <div className={`w-px h-14 transition-colors ${isPast ? 'bg-emerald-200' : 'bg-gradient-to-b from-gray-300 to-gray-200'}`} />}
                  </div>
                  <div className="pt-2 pb-4">
                    <h3 className={`font-bold text-base transition-colors ${isActive ? 'text-primary' : isPast ? 'text-gray-900' : 'text-gray-400'}`}>{step.title}</h3>
                    <p className={`text-sm mt-0.5 transition-colors ${isActive ? 'text-gray-700' : isPast ? 'text-gray-500' : 'text-gray-400'}`}>{step.desc}</p>
                  </div>
                </div>
              )})}
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2">
              {['Revenue Forecast', 'Customer Persona', 'Cost Intel', 'AI Strategy', 'Marketing Plan', 'What-If Scenarios', 'Market Tracker', 'A/B Compare'].map((f) => (
                <span key={f} className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">{f}</span>
              ))}
            </div>
          </div>

            {/* Right Column: Form (Glassmorphism) */}
          <div className="lg:col-span-7 animate-slide-up">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 md:p-10 space-y-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent opacity-50 pointer-events-none rounded-full blur-3xl" />


              {/* ─── PHASE: AB COMPARE BANNER ─────────────────────────────── */}
              {phase === 'ab_compare' && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-violet-600 mt-0.5" style={{ fontSize: '20px' }}>compare_arrows</span>
                  <div>
                    <p className="text-sm font-bold text-violet-800">A/B Comparison Mode</p>
                    <p className="text-xs text-violet-600 mt-0.5">Pin a second location on the map to compare, then run Quick Preview again to see side-by-side metrics.</p>
                  </div>
                  <button onClick={() => { setPhase('explore'); setPreviewData(null); }}
                    className="ml-auto text-violet-400 hover:text-violet-700 transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Business Name + Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Business Name</label>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="e.g. Blue Coffee" />
                </div>
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Business Type</label>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer">
                    <option value="cafe">Cafe / Coffee Shop</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="grocery">Grocery / Supermarket</option>
                    <option value="retail">Retail / Electronics</option>
                    <option value="clothing">Clothing / Apparel</option>
                    <option value="salon">Salon / Beauty Parlour</option>
                    <option value="gym">Gym / Fitness Center</option>
                    <option value="pharmacy">Pharmacy / Medical Store</option>
                    <option value="bakery">Bakery / Sweet Shop</option>
                    <option value="other">Other (Specify)</option>
                  </select>
                  {businessType === 'other' && (
                    <input value={customBusinessType} onChange={(e) => setCustomBusinessType(e.target.value)} required
                      className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="e.g. Pet Store, Hardware" />
                  )}
                </div>
              </div>

              {/* Owner Type & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Experience Level</label>
                  <div className="flex p-1.5 bg-gray-100 rounded-xl border border-gray-200 h-[50px]">
                    {(['new', 'existing'] as const).map((type) => (
                      <button key={type} type="button" onClick={() => setOwnerType(type)}
                        className={`flex-1 flex items-center justify-center text-[13px] font-bold rounded-lg transition-all ${ownerType === type ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
                        {type === 'new' ? '🆕 New Founder' : '⚡ Serial Founder'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Starting Budget (₹)</label>
                  <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" required placeholder="e.g. 500000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  📍 Location — {phase === 'ab_compare' ? 'Pin your 2nd location' : 'Click anywhere on the map'}
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 !text-lg">search</span>
                    <input ref={searchInputRef}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Search location..." />
                  </div>
                  <button type="button" onClick={handleMyLocation}
                    className="bg-primary hover:bg-primary-hover text-white size-12 rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <span className="material-symbols-outlined !text-xl">my_location</span>
                  </button>
                </div>
                {selectedLocation && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: '16px' }}>
                      {phase === 'decision' ? 'check_circle' : 'location_on'}
                    </span>
                    <p className="text-sm text-emerald-700 font-medium truncate">{selectedLocation}</p>
                  </div>
                )}
                <div className="h-[400px] rounded-xl bg-gray-100 overflow-hidden border border-gray-200 shadow-inner">
                  <div ref={mapRef} className="w-full h-full" />
                </div>

                {/* Radius */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0">Radius</label>
                  <select value={radius}
                    onChange={(e) => { setRadius(e.target.value); if (circleRef.current) circleRef.current.setRadius(parseInt(e.target.value)); }}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-primary transition-all cursor-pointer">
                    <option value="500">500m – Very Local</option>
                    <option value="1000">1km – Neighbourhood</option>
                    <option value="2000">2km – District</option>
                    <option value="5000">5km – City-wide</option>
                  </select>
                </div>
              </div>

              {/* ─── PHASE 1: QUICK PREVIEW BUTTON ────────────────────────── */}
              {(phase === 'explore' || phase === 'ab_compare') && (
                <div className="space-y-3">
                  {previewError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{previewError}</p>
                  )}
                  <button type="button" onClick={handlePreview} disabled={previewing || !latitude}
                    className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold py-4 px-6 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 disabled:opacity-60">
                    {previewing
                      ? <><span className="material-symbols-outlined !text-xl animate-spin">refresh</span>Running Quick Preview…</>
                      : <><span className="material-symbols-outlined !text-xl">radar</span>Run Quick Preview</>
                    }
                  </button>
                  <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Free 5-second scan before you commit
                  </p>
                </div>
              )}

              {/* ─── PHASE 1 PREVIEW LOADER ──────────────────────────────── */}
              {previewing && (
                <div className="border border-gray-200 rounded-xl overflow-hidden p-8 flex flex-col items-center justify-center gap-4 bg-gray-50 animate-pulse">
                   <div className="relative">
                     <span className="material-symbols-outlined text-4xl text-primary animate-spin">radar</span>
                     <span className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" />
                   </div>
                   <p className="text-gray-600 font-bold text-center mt-2">Scanning target area...</p>
                   <p className="text-xs text-gray-400 text-center -mt-2">Pulling demographic data, competitor ratings, and demand signals.</p>
                   <div className="w-full max-w-xs h-1.5 bg-gray-200 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-primary rounded-full w-2/3 animate-[pulse_1s_ease-in-out_infinite]" />
                   </div>
                </div>
              )}

              {/* ─── PHASE 1 PREVIEW RESULTS (MODAL) ─────────────────────── */}
              {phase === 'decision' && previewData && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fade-in">
                  <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
                    <button onClick={() => setPhase('explore')} className="absolute z-10 top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>

                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2 rounded-t-2xl">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>preview</span>
                      <span className="text-sm font-bold text-gray-700">📊 Quick Preview — {businessType} · {selectedLocation.split(',')[0]}</span>
                    </div>

                  {/* Score chips */}
                  <div className="grid grid-cols-3 gap-px bg-gray-200">
                    {[
                      { label: 'Competitors', value: previewData.competitor_count, sub: previewData.competition_level, color: 'text-orange-600 bg-orange-50' },
                      { label: 'Avg Rating', value: `${previewData.avg_rating}★`, sub: previewData.demand_level + ' demand', color: 'text-amber-600 bg-amber-50' },
                      { label: 'Customer Score', value: `${previewData.customer_score}/100`, sub: 'Area potential', color: 'text-emerald-600 bg-emerald-50' },
                    ].map((chip) => (
                      <div key={chip.label} className={`p-4 ${chip.color}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{chip.label}</p>
                        <p className="text-xl font-extrabold mt-0.5">{chip.value}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">{chip.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Top competitors */}
                  {previewData.top_competitors?.length > 0 && (
                    <div className="px-5 py-3 border-b border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Top Competitors Nearby</p>
                      <div className="flex flex-col gap-1">
                        {previewData.top_competitors.map((c: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 font-medium truncate max-w-[65%]">{c.name}</span>
                            <span className="text-amber-600 font-bold shrink-0">{c.rating}★</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Opinion */}
                  <div className="px-5 py-4 bg-blue-50/60 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>smart_toy</span>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">BizMind AI Opinion</p>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{previewData.ai_opinion}</div>
                  </div>

                  {/* Decision Buttons */}
                  <div className="p-5 bg-white space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">What would you like to do?</p>
                    <div className="grid grid-cols-1 gap-3">
                      <button onClick={lockLocation} disabled={!businessName.trim()}
                        className="flex items-center justify-center gap-2.5 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-md disabled:opacity-50 disabled:hover:translate-y-0">
                        <span className="material-symbols-outlined !text-xl">lock</span>
                        🔒 Lock This Location & Run Full Analysis
                      </button>
                      <button onClick={tryDifferentLocation}
                        className="flex items-center justify-center gap-2.5 py-3 px-5 border-2 border-violet-300 text-violet-700 font-bold rounded-xl hover:bg-violet-50 transition-all">
                        <span className="material-symbols-outlined !text-xl">compare_arrows</span>
                        🔄 Try a Different Location (A/B Compare)
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">Locking will unlock Revenue Forecast, AI Strategy, Marketing Plan & 6 more features</p>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>
      </div>
    </>
  );
}
