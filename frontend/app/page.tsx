'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const handleGetStarted = () => {
    if (!isLoading && !user) {
      router.push('/login');
    } else {
      router.push('/analyze');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-[120px] pointer-events-none" />

      <main className="relative z-10 pt-24 md:pt-32 pb-24 px-4 md:px-6 max-w-6xl mx-auto text-center flex flex-col items-center justify-center min-h-[85vh]">
        
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-bold text-primary mb-8 animate-fade-in">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
          AI-Powered Location Intelligence
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-gray-900 mb-6 animate-slide-up">
          Make Smarter <br className="hidden md:block" />
          <span className="text-primary">Business Decisions</span> with AI
        </h1>

        <p className="text-lg md:text-xl text-gray-600 font-medium max-w-2xl leading-relaxed mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
          Instantly evaluate locations, analyze competitors, uncover demand signals, and generate precise revenue forecasts before you commit to a site.
        </p>

        <button 
          onClick={handleGetStarted}
          className="bg-primary hover:bg-primary-hover text-white text-base md:text-lg font-extrabold py-4 md:py-5 px-8 md:px-10 rounded-2xl shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 flex items-center justify-center gap-3 animate-slide-up focus:outline-none focus:ring-4 focus:ring-primary/30"
          style={{ animationDelay: '200ms' }}
        >
          <span className="material-symbols-outlined !text-2xl">radar</span>
          Start Free Analysis
        </button>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-4xl text-left animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined !text-2xl">location_on</span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Hyper-Local Intel</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Map transit points, offices, and footfall heatmaps to see where your customers actually are.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined !text-2xl">insights</span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Competitor Analysis</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Discover nearby competitors, parse their reviews, and automatically identify gaps in the market.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined !text-2xl">monitoring</span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Revenue Forecasts</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Simulate cost and revenue projections month-by-month to accurately determine your break-even.</p>
          </div>
        </div>

      </main>
    </div>
  );
}
