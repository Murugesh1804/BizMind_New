'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { analyze } from '@/lib/api';
import AnalysisLoader from '@/components/AnalysisLoader';

declare global {
  interface Window {
    google: any;
    initBizMindMap: () => void;
  }
}

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('500');
  const [ownerType, setOwnerType] = useState<'new' | 'existing'>('new');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Redirect non-authed users
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
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
    if (!mapRef.current || !window.google) return;
    const defaultCenter = { lat: 13.0827, lng: 80.2707 };
    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();

    if (searchInputRef.current) {
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
    });
  };

  const setLocationOnMap = (lat: number, lng: number, address?: string) => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    if (markerRef.current) markerRef.current.setMap(null);
    if (circleRef.current) circleRef.current.setMap(null);

    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      animation: window.google.maps.Animation.DROP,
    });

    const r = parseInt(radius) || 500;
    circleRef.current = new window.google.maps.Circle({
      map,
      center: { lat, lng },
      radius: r,
      fillColor: '#13a4ec',
      fillOpacity: 0.2,
      strokeColor: '#13a4ec',
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });

    setLatitude(String(lat));
    setLongitude(String(lng));

    if (address) {
      setSelectedLocation(address);
      setLocation(address);
    } else {
      geocoderRef.current?.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        const addr = status === 'OK' && results[0] ? results[0].formatted_address : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const locationValue = location || selectedLocation;
    if (!locationValue && !latitude) {
      setError('Please select a location on the map.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('business_name', businessName);
      formData.append('business_type', businessType);
      formData.append('location', locationValue);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('radius', radius);
      formData.append('owner_type', ownerType);

      const data = await analyze(formData);
      sessionStorage.setItem('analysisResult', JSON.stringify(data));
      router.push('/dashboard');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Analysis failed. Please try again.';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-primary animate-spin">refresh</span>
      </div>
    );
  }

  return (
    <>
      {/* Full-screen analysis loader overlay */}
      {submitting && (
        <AnalysisLoader businessName={businessName} />
      )}
      <main className="pt-28 md:pt-36 pb-24 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">

          {/* Left Column */}
          <div className="lg:col-span-6 flex flex-col gap-10 md:gap-12 animate-fade-in">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-gray-900">
                Make Smarter <br />
                <span className="text-primary">Business Decisions</span> with AI
              </h1>
              <p className="text-lg md:text-xl text-gray-600 font-medium max-w-xl leading-relaxed">
                Analyze competitors, understand customer sentiment, evaluate demand, and discover the
                best strategy for your next business — powered by real-time geospatial data and advanced AI insights.
              </p>
            </div>

            {/* Vertical Stepper */}
            <div className="flex flex-col space-y-1">
              {[
                { icon: 'edit_note', title: 'Define Your Business', desc: 'Enter business details and location', active: true },
                { icon: 'database', title: 'Gather Data', desc: 'Collect demographic insights', active: false },
                { icon: 'smart_toy', title: 'AI Analysis', desc: 'Process competition and traffic', active: false },
                { icon: 'verified', title: 'Get Results', desc: 'Receive comprehensive viability score', active: false },
              ].map((step, i) => (
                <div key={i} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className={`size-12 rounded-xl flex items-center justify-center border shadow-sm ${step.active ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                      <span className="material-symbols-outlined !text-xl">{step.icon}</span>
                    </div>
                    {i < 3 && <div className="w-px h-14 bg-gradient-to-b from-gray-300 to-gray-200" />}
                  </div>
                  <div className="pt-2 pb-4">
                    <h3 className={`font-bold text-base ${step.active ? 'text-gray-900' : 'text-gray-400'}`}>{step.title}</h3>
                    <p className={`text-sm mt-0.5 ${step.active ? 'text-gray-500' : 'text-gray-400'}`}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-6 animate-slide-up">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-8 md:p-10 hover:shadow-2xl transition-all duration-300">
              <form onSubmit={handleSubmit} className="space-y-7">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Business Name + Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Business Name</label>
                    <input
                      value={businessName} onChange={(e) => setBusinessName(e.target.value)} required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="e.g. Blue Coffee"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Business Type</label>
                    <input
                      value={businessType} onChange={(e) => setBusinessType(e.target.value)} required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="e.g. cafe, restaurant"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-3.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Location</label>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 !text-lg">search</span>
                      <input
                        ref={searchInputRef}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="Search for a location..."
                      />
                    </div>
                    <button type="button" onClick={handleMyLocation}
                      className="bg-primary hover:bg-primary-hover text-white size-12 rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                      <span className="material-symbols-outlined !text-xl">my_location</span>
                    </button>
                  </div>

                  {selectedLocation && (
                    <input
                      value={selectedLocation} readOnly
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 focus:outline-none"
                      placeholder="No location selected"
                    />
                  )}

                  <div className="h-72 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 shadow-inner">
                    <div ref={mapRef} className="w-full h-full" />
                  </div>
                </div>

                {/* Radius */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Search Radius</label>
                  <select
                    value={radius} onChange={(e) => { setRadius(e.target.value); if (circleRef.current) circleRef.current.setRadius(parseInt(e.target.value) || 500); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                  >
                    <option value="500">500m (0.5km) - Very Local</option>
                    <option value="1000">1km - Neighborhood</option>
                    <option value="2000">2km - District</option>
                    <option value="5000">5km - City-wide</option>
                  </select>
                </div>

                {/* Owner Type */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Experience Level</label>
                  <div className="flex p-1.5 bg-gray-100 rounded-xl border border-gray-200">
                    {(['new', 'existing'] as const).map((type) => (
                      <button
                        key={type} type="button" onClick={() => setOwnerType(type)}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${ownerType === type ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        {type === 'new' ? 'New Owner' : 'Serial Entrepreneur'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={submitting}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold py-4 px-6 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 group disabled:opacity-70">
                  <span className="text-base">{submitting ? 'Analyzing...' : 'Analyze Location'}</span>
                  {submitting
                    ? <span className="material-symbols-outlined !text-xl animate-spin">refresh</span>
                    : <span className="material-symbols-outlined !text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  }
                </button>
                <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-3">
                  {submitting
                    ? 'Running AI analysis\u2026 please wait (10\u201330s)'
                    : 'Analysis typically takes 10\u201330s depending on location data'}
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
