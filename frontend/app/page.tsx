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

  const handleStartAnalysis = () => {
    if (!isLoading && !user) {
      router.push('/login');
    } else {
      router.push('/analyze');
    }
  };

  return (
    <>
      <style jsx global>{`
        .mesh-gradient {
          background-color: #f9f9ff;
          background-image: 
            radial-gradient(at 0% 0%, rgba(0, 91, 175, 0.05) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(0, 108, 69, 0.05) 0px, transparent 50%),
            radial-gradient(at 50% 50%, rgba(213, 227, 255, 0.1) 0px, transparent 80%);
        }
        .glass-plate {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .bg-surface { background-color: #f9f9ff; }
        .bg-primary { background-color: #005baf; }
        .bg-primary-fixed { background-color: #d5e3ff; }
        .bg-primary-container { background-color: #0074db; }
        .bg-secondary { background-color: #006c45; }
        .bg-secondary-container { background-color: #93f3be; }
        .bg-tertiary { background-color: #505d6f; }
        .bg-tertiary-container { background-color: #687688; }
        .bg-surface-container-low { background-color: #f1f3fd; }
        .bg-surface-container { background-color: #ebedf7; }
        .bg-surface-container-high { background-color: #e6e8f1; }
        .bg-surface-container-highest { background-color: #e0e2ec; }
        .bg-surface-variant { background-color: #e0e2ec; }
        .bg-error { background-color: #ba1a1a; }
        .bg-error-container { background-color: #ffdad6; }
        .bg-on-background { background-color: #181c22; }
        .bg-on-surface { background-color: #181c22; }
        .bg-on-primary { background-color: #ffffff; }
        .bg-on-secondary { background-color: #ffffff; }
        .bg-on-tertiary { background-color: #ffffff; }
        .bg-on-error { background-color: #ffffff; }
        .text-on-background { color: #181c22; }
        .text-on-surface { color: #181c22; }
        .text-on-surface-variant { color: #414753; }
        .text-on-primary { color: #ffffff; }
        .text-on-secondary { color: #ffffff; }
        .text-on-tertiary { color: #ffffff; }
        .text-on-error { color: #ffffff; }
        .text-on-primary-fixed { color: #001b3c; }
        .text-on-secondary-fixed { color: #002112; }
        .text-on-tertiary-fixed { color: #0f1c2c; }
        .text-primary { color: #005baf; }
        .text-secondary { color: #006c45; }
        .text-tertiary { color: #505d6f; }
        .text-outline { color: #717785; }
        .text-error { color: #ba1a1a; }
        .border-outline-variant { border-color: #c1c6d5; }
        .border-primary { border-color: #005baf; }
        .border-secondary { border-color: #006c45; }
        .border-surface { border-color: #f9f9ff; }
        .shadow-primary\\/5 { --tw-shadow-color: rgba(0, 91, 175, 0.05); }
        .shadow-primary\\/10 { --tw-shadow-color: rgba(0, 91, 175, 0.10); }
        .shadow-primary\\/20 { --tw-shadow-color: rgba(0, 91, 175, 0.20); }
        .shadow-primary\\/30 { --tw-shadow-color: rgba(0, 91, 175, 0.30); }
        .shadow-secondary\\/5 { --tw-shadow-color: rgba(0, 108, 69, 0.05); }
        .shadow-secondary\\/10 { --tw-shadow-color: rgba(0, 108, 69, 0.10); }
      `}</style>

      <div className="min-h-screen font-sans selection:bg-primary-fixed selection:text-on-primary-fixed mesh-gradient overflow-x-hidden">

        {/* Hero Section - BizMind */}
        <main className="relative pt-48 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="mb-8 px-5 py-2 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold tracking-widest uppercase flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            AI-Powered Business Intelligence
          </div>
          
          <h1 className="font-headline text-6xl md:text-8xl lg:text-[7.5rem] font-extrabold tracking-tighter text-on-background leading-[0.9] mb-8">
            Find the Perfect<br />
            Location. Every Time.
          </h1>
          
          <p className="max-w-2xl text-on-surface-variant text-lg md:text-xl font-light leading-relaxed mb-12">
            BizMind analyzes foot traffic, competitors, demographics, and demand signals to predict your business success before you sign the lease.
          </p>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            <button 
              onClick={handleStartAnalysis}
              className="bg-primary text-on-primary px-10 py-5 rounded-full text-lg font-bold shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95"
            >
              Start Free Analysis
            </button>
            <div className="flex items-center gap-2 group cursor-pointer py-3 px-6 rounded-full hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform">play_circle</span>
              <span className="font-medium text-on-surface-variant">Watch Demo</span>
            </div>
          </div>

          {/* Metrics Row - BizMind Stats */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl border-y border-outline-variant/15 py-12">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold tracking-tighter text-on-background">50M+</span>
              <span className="text-sm font-medium uppercase tracking-widest text-outline">Location Data Points</span>
            </div>
            <div className="flex flex-col items-center border-x-0 md:border-x border-outline-variant/15 px-8">
              <span className="text-4xl font-extrabold tracking-tighter text-on-background">95%</span>
              <span className="text-sm font-medium uppercase tracking-widest text-outline">Forecast Accuracy</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold tracking-tighter text-on-background">500+</span>
              <span className="text-sm font-medium uppercase tracking-widest text-outline">Businesses Helped</span>
            </div>
          </div>
        </main>

        {/* Features Section - BizMind Workflow */}
        <section className="py-32 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-4">How BizMind Works</h2>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
          </div>
          
          <div className="relative flex flex-col items-center">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-secondary/40 to-transparent hidden md:block"></div>
            
            {/* Step 1 - Location Analysis */}
            <div className="relative w-full mb-24 md:mb-40 flex flex-col md:flex-row items-center group">
              <div className="w-full md:w-1/2 md:pr-24 text-center md:text-right order-2 md:order-1">
                <h3 className="text-3xl font-bold mb-4 text-on-background">Smart Location Scoring</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed">
                  We analyze foot traffic patterns, nearby transit points, offices, residential density, and parking availability to score every location.
                </p>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-lowest border-4 border-surface shadow-xl shadow-primary/10">
                <span className="material-symbols-outlined text-primary text-xl">location_on</span>
              </div>
              <div className="w-full md:w-1/2 md:pl-24 order-1 md:order-2 mb-8 md:mb-0">
                <div className="glass-plate p-10 rounded-xl shadow-2xl shadow-primary/5 transition-transform group-hover:scale-[1.02]">
                  <div className="aspect-square w-full rounded-lg bg-surface-container-low flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-primary to-secondary"></div>
                    <span className="material-symbols-outlined text-6xl text-primary opacity-40">map</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 - Competitor Analysis */}
            <div className="relative w-full mb-24 md:mb-40 flex flex-col md:flex-row items-center group">
              <div className="w-full md:w-1/2 md:pr-24 order-1 mb-8 md:mb-0">
                <div className="glass-plate p-10 rounded-xl shadow-2xl shadow-secondary/5 transition-transform group-hover:scale-[1.02]">
                  <div className="aspect-square w-full rounded-lg bg-surface-container-low flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-bl from-secondary to-primary-fixed"></div>
                    <span className="material-symbols-outlined text-6xl text-secondary opacity-40">store</span>
                  </div>
                </div>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-lowest border-4 border-surface shadow-xl shadow-secondary/10">
                <span className="material-symbols-outlined text-secondary text-xl">search</span>
              </div>
              <div className="w-full md:w-1/2 md:pl-24 text-center md:text-left order-2">
                <h3 className="text-3xl font-bold mb-4 text-on-background">Competitor Intelligence</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed">
                  Discover nearby competitors, analyze their reviews, identify market gaps, and understand what customers in the area truly want.
                </p>
              </div>
            </div>

            {/* Step 3 - Revenue Forecasting */}
            <div className="relative w-full flex flex-col md:flex-row items-center group">
              <div className="w-full md:w-1/2 md:pr-24 text-center md:text-right order-2 md:order-1">
                <h3 className="text-3xl font-bold mb-4 text-on-background">Revenue Forecasting</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed">
                  Get month-by-month revenue and cost projections powered by AI. Know your break-even point before you invest a single dollar.
                </p>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-primary text-on-primary border-4 border-surface shadow-xl shadow-primary/20">
                <span className="material-symbols-outlined text-xl">trending_up</span>
              </div>
              <div className="w-full md:w-1/2 md:pl-24 order-1 md:order-2 mb-8 md:mb-0">
                <div className="glass-plate p-10 rounded-xl shadow-2xl shadow-primary/5 transition-transform group-hover:scale-[1.02]">
                  <div className="aspect-square w-full rounded-lg bg-surface-container-low flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-primary-container to-secondary-container"></div>
                    <span className="material-symbols-outlined text-6xl text-primary opacity-40">monitoring</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - BizMind */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto glass-plate rounded-xl p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
            
            <h2 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tight text-on-background mb-8 relative z-10">
              Ready to Find Your Perfect Spot?
            </h2>
            <p className="text-on-surface-variant text-xl mb-12 max-w-2xl mx-auto relative z-10">
              Join hundreds of entrepreneurs and enterprises using BizMind to make data-driven location decisions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <button 
                onClick={handleGetStarted}
                className="w-full sm:w-auto bg-on-background text-background px-12 py-5 rounded-full font-bold text-lg hover:bg-slate-800 transition-colors"
              >
                Start Free Analysis
              </button>
              <button className="w-full sm:w-auto border border-outline-variant px-12 py-5 rounded-full font-bold text-lg hover:bg-surface-container-low transition-colors">
                View Pricing
              </button>
            </div>
          </div>
        </section>

        {/* Footer - BizMind */}
        <footer className="bg-slate-50 w-full py-16 px-12 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto rounded-t-[3rem] mt-20">
          <div className="mb-10 md:mb-0 text-center md:text-left">
            <div className="text-xl font-bold text-slate-900 mb-2">BizMind</div>
            <p className="font-manrope text-sm tracking-wide text-slate-500">2024 BizMind. Smart Location Intelligence.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            <a className="font-manrope text-sm tracking-wide text-slate-500 hover:text-blue-600 transition-colors" href="#">Privacy Policy</a>
            <a className="font-manrope text-sm tracking-wide text-slate-500 hover:text-blue-600 transition-colors" href="#">Terms of Service</a>
            <a className="font-manrope text-sm tracking-wide text-slate-500 hover:text-blue-600 transition-colors" href="#">Help Center</a>
            <a className="font-manrope text-sm tracking-wide text-slate-500 hover:text-blue-600 transition-colors" href="#">API Docs</a>
          </div>
          <div className="mt-10 md:mt-0 flex gap-6">
            <a className="text-slate-400 hover:text-primary transition-colors" href="#">
              <span className="material-symbols-outlined">mail</span>
            </a>
            <a className="text-slate-400 hover:text-primary transition-colors" href="#">
              <span className="material-symbols-outlined">chat</span>
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}

