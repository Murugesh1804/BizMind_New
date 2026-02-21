'use client';
import { useState } from 'react';
import DashboardNav from '@/components/DashboardNav';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import { formatInsight } from '@/lib/formatInsight';
import { useAnalysisData } from '@/lib/hooks';
import type { AnalysisResult, FeatureData } from '@/lib/types';

const TH = { fontFamily: "'Tiempos Headline', 'Playfair Display', serif" };

/* ── PDF print styles injected into a hidden iframe ───────────────────────── */
function buildPrintHTML(data: any): string {
    const scorePct = Math.round((data.success_score / 10) * 100);
    const features = data.features || {};
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const recommendation = data.recommendation || (
        data.success_score >= 7 ? 'Strongly Recommended' :
            data.success_score >= 4 ? 'Moderate Potential' : 'Not Recommended'
    );
    const recColor = data.success_score >= 7 ? '#059669' : data.success_score >= 4 ? '#d97706' : '#dc2626';

    function renderSection(title: string, content: string, icon: string): string {
        if (!content || content === 'No data available') return '';
        // Convert markdown to plain HTML for print
        const lines = content.split('\n').filter(l => l.trim());
        const items = lines.map(l => {
            const t = l.trim().replace(/^[-*•]\s+/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            if (/^[-*•]\s+/.test(l.trim())) return `<li>${t}</li>`;
            if (/^#{1,4}\s/.test(l.trim())) return `<h5>${t.replace(/^#{1,4}\s+/, '')}</h5>`;
            return `<p>${t}</p>`;
        }).join('');

        return `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">${icon}</span>
                <h3>${title}</h3>
            </div>
            <div class="section-body">
                <ul>${items}</ul>
            </div>
        </div>`;
    }

    const competitorRows = (data.competitors || []).slice(0, 8).map((c: any) => `
        <tr>
            <td>${c.name || '—'}</td>
            <td>${c.rating ? `${parseFloat(c.rating).toFixed(1)} ★` : '—'}</td>
            <td>${c.reviews_count ? c.reviews_count.toLocaleString() : '—'}</td>
            <td>${c.distance_km ? `${c.distance_km} km` : '—'}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>BizMind Report — ${data.business_name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #2D2D2D; background: #fff; font-size: 11px; }

  /* ── Cover ── */
  .cover {
    background: #111921;
    color: white;
    padding: 48px 40px 36px;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 220px; height: 220px;
    background: #1d73c920;
    border-radius: 50%;
    filter: blur(60px);
  }
  .brand { font-family: 'Playfair Display', serif; font-size: 14px; color: #1d73c9; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 32px; display: flex; align-items: center; gap: 8px; }
  .brand-dot { width: 8px; height: 8px; border-radius: 50%; background: #1d73c9; }
  .cover h1 { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 10px; }
  .cover .subtitle { color: #94a3b8; font-size: 12px; margin-bottom: 28px; }
  .cover .badges { display: flex; gap: 10px; flex-wrap: wrap; }
  .badge { border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 12px; font-size: 10px; color: #cbd5e1; }
  .badge.score { background: #1d73c910; border-color: #1d73c9; color: #60a5fa; font-weight: 700; }
  .meta-row { display: flex; gap: 24px; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }
  .meta-item { flex: 1; }
  .meta-label { color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; font-size: 9px; margin-bottom: 4px; }
  .meta-value { color: white; font-weight: 700; font-size: 13px; }

  /* ── Score band ── */
  .score-band { padding: 20px 40px; background: #F9F9F8; border-bottom: 1px solid #E5E5E5; display: flex; align-items: center; gap: 24px; }
  .score-circle { width: 64px; height: 64px; border-radius: 50%; background: #1d73c9; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  .score-circle .num { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; line-height: 1; }
  .score-circle .pct { font-size: 8px; opacity: 0.8; }
  .score-details h2 { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; }
  .score-details .rec { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-top: 4px; color: ${recColor}; border: 1px solid ${recColor}40; background: ${recColor}10; }
  .sub-scores { margin-left: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .sub-score-row { display: flex; align-items: center; gap: 6px; font-size: 10px; }
  .sub-score-bar-wrap { width: 80px; height: 5px; background: #E5E5E5; border-radius: 3px; overflow: hidden; }
  .sub-score-bar-fill { height: 100%; border-radius: 3px; background: #1d73c9; }
  .sub-score-label { color: #6B7280; width: 72px; }
  .sub-score-val { font-weight: 700; color: #2D2D2D; width: 28px; text-align: right; }

  /* ── Content area ── */
  .content { padding: 28px 40px; }
  h2.content-title { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: #2D2D2D; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #1d73c9; display: inline-block; }

  /* ── Customer base ── */
  .pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .pillar { background: #F9F9F8; border: 1px solid #E5E5E5; border-radius: 10px; padding: 14px 10px; text-align: center; }
  .pillar-val { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #1d73c9; }
  .pillar-label { font-size: 9px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }

  /* ── Competitors table ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10.5px; }
  th { background: #F9F9F8; font-weight: 700; text-align: left; padding: 8px 10px; border-bottom: 2px solid #E5E5E5; color: #2D2D2D; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 7px 10px; border-bottom: 1px solid #F3F4F6; color: #374151; }
  tr:hover td { background: #F9F9F8; }

  /* ── Insight sections ── */
  .section { margin-bottom: 20px; background: #F9F9F8; border: 1px solid #E5E5E5; border-left: 3px solid #1d73c9; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
  .section-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: white; border-bottom: 1px solid #E5E5E5; }
  .section-icon { font-size: 13px; }
  .section-header h3 { font-family: 'Playfair Display', serif; font-size: 11px; font-weight: 700; color: #2D2D2D; }
  .section-body { padding: 10px 14px; }
  .section-body ul { list-style: none; }
  .section-body li { position: relative; padding-left: 14px; margin-bottom: 5px; color: #374151; line-height: 1.55; }
  .section-body li::before { content: '▸'; position: absolute; left: 0; color: #1d73c9; font-size: 9px; top: 2px; }
  .section-body p { margin-bottom: 4px; color: #374151; line-height: 1.55; }
  .section-body h5 { font-weight: 700; color: #1d73c9; margin: 6px 0 3px; font-size: 10px; }
  .section-body strong { font-weight: 700; color: #111827; }

  /* ── Footer ── */
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E5E5; display: flex; align-items: center; justify-content: space-between; color: #9CA3AF; font-size: 9px; }
  .footer .brand-small { font-family: 'Playfair Display', serif; color: #1d73c9; font-weight: 700; }

  @page { margin: 0; size: A4; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .cover { break-after: page; }
  }
</style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <div class="brand">
      <div class="brand-dot"></div>
      BizMind · AI Business Location Analysis
    </div>
    <h1>${data.business_name}</h1>
    <p class="subtitle">${data.business_type} · ${data.location}</p>
    <div class="badges">
      <span class="badge score">Score: ${scorePct}%</span>
      <span class="badge">${recommendation}</span>
      <span class="badge">${data.owner_type === 'new' ? 'New Entrepreneur' : 'Existing Business'}</span>
      <span class="badge">${data.radius}m Search Radius</span>
    </div>
    <div class="meta-row">
      <div class="meta-item"><div class="meta-label">Generated On</div><div class="meta-value">${date}</div></div>
      <div class="meta-item"><div class="meta-label">Analysis ID</div><div class="meta-value">#${data.analysis_id || '—'}</div></div>
      <div class="meta-item"><div class="meta-label">Competitors Analyzed</div><div class="meta-value">${data.competitors_count ?? (data.competitors?.length ?? '—')}</div></div>
      <div class="meta-item"><div class="meta-label">Coordinates</div><div class="meta-value">${data.latitude ? `${parseFloat(data.latitude).toFixed(4)}, ${parseFloat(data.longitude).toFixed(4)}` : 'N/A'}</div></div>
    </div>
  </div>

  <!-- Score Band -->
  <div class="score-band">
    <div class="score-circle">
      <span class="num">${scorePct}</span>
      <span class="pct">%</span>
    </div>
    <div class="score-details">
      <h2>Success Confidence Score</h2>
      <span class="rec">${recommendation}</span>
    </div>
    <div class="sub-scores">
      ${[
            { l: 'Competition', v: features.competition_score ?? 0 },
            { l: 'Demand', v: features.demand_score ?? 0 },
            { l: 'Rating', v: features.rating_score ?? 0 },
            { l: 'Opportunity', v: features.opportunity_score ?? 0 },
        ].map(s => `
        <div class="sub-score-row">
          <span class="sub-score-label">${s.l}</span>
          <div class="sub-score-bar-wrap">
            <div class="sub-score-bar-fill" style="width:${Math.round(s.v * 100)}%"></div>
          </div>
          <span class="sub-score-val">${Math.round(s.v * 100)}%</span>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Content -->
  <div class="content">

    <!-- Customer Base -->
    <h2 class="content-title">Customer Base Indicators</h2>
    <div class="pillars">
      <div class="pillar"><div class="pillar-val">${data.apartments_count ?? 0}</div><div class="pillar-label">Residential</div></div>
      <div class="pillar"><div class="pillar-val">${data.education_count ?? 0}</div><div class="pillar-label">Education</div></div>
      <div class="pillar"><div class="pillar-val">${data.offices_count ?? 0}</div><div class="pillar-label">Offices</div></div>
      <div class="pillar"><div class="pillar-val">${data.transit_count ?? 0}</div><div class="pillar-label">Transit</div></div>
    </div>

    <!-- Competitors table -->
    <h2 class="content-title">Nearby Competitors</h2>
    <table>
      <thead>
        <tr><th>Name</th><th>Rating</th><th>Reviews</th><th>Distance</th></tr>
      </thead>
      <tbody>${competitorRows}</tbody>
    </table>

    <!-- AI Insight sections -->
    <h2 class="content-title">AI-Generated Insights</h2>
    ${renderSection('Customer Sentiment', data.competitive_landscape || '', '💬')}
    ${renderSection('Market Opportunity', data.customer_insights || '', '📈')}
    ${renderSection('Pricing Strategy', data.pricing_insights || data.ai_insights?.pricing || '', '💰')}
    ${renderSection('Customer Base Analysis', data.ai_insights?.customer_base || '', '👥')}
    ${renderSection('Risk Factors', data.risk_assessment || '', '⚠️')}
    ${renderSection('Strategic Recommendations', data.strategic_recommendations || '', '✅')}

    <!-- Footer -->
    <div class="footer">
      <span><span class="brand-small">BizMind</span> · AI Business Location Decision Support System</span>
      <span>Confidential · For internal use only</span>
      <span>Generated ${date}</span>
    </div>
  </div>
</body>
</html>`;
}

export default function ReportPage() {
    const { data, isLoading } = useAnalysisData();
    const [printing, setPrinting] = useState(false);

    const handlePrint = () => {
        if (!data) return;
        setPrinting(true);
        const html = buildPrintHTML(data);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentDocument!.open();
        iframe.contentDocument!.write(html);
        iframe.contentDocument!.close();
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow!.focus();
                iframe.contentWindow!.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    setPrinting(false);
                }, 1000);
            }, 400);
        };
    };

    if (!data || isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F9F9F8]">
                <span className="material-symbols-outlined text-6xl text-[#1d73c9] animate-spin">refresh</span>
                <p className="text-[#6B7280] font-medium">Preparing report…</p>
            </div>
        );
    }

    const scorePct = Math.round((data.success_score / 10) * 100);
    const features = (data.features || {}) as Partial<FeatureData>;
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const recommendation = data.recommendation || (
        data.success_score >= 7 ? 'Strongly Recommended' :
            data.success_score >= 4 ? 'Moderate Potential' : 'Not Recommended'
    );
    const recCls = data.success_score >= 7
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : data.success_score >= 4
            ? 'text-amber-700 bg-amber-50 border-amber-200'
            : 'text-red-700 bg-red-50 border-red-200';

    const INSIGHT_SECTIONS = [
        { label: 'Customer Sentiment', key: 'competitive_landscape', icon: 'sentiment_satisfied' },
        { label: 'Market Opportunity', key: 'customer_insights', icon: 'trending_up' },
        { label: 'Pricing Strategy', key: 'pricing_insights', icon: 'payments' },
        { label: 'Customer Base Analysis', key: 'customer_base_ai', icon: 'groups' },
        { label: 'Risk Factors', key: 'risk_assessment', icon: 'warning' },
        { label: 'Strategic Recommendations', key: 'strategic_recommendations', icon: 'lightbulb' },
    ];

    const contentMap: Record<string, string> = {
        competitive_landscape: data.competitive_landscape || '',
        customer_insights: data.customer_insights || '',
        pricing_insights: data.pricing_insights || data.ai_insights?.pricing || '',
        customer_base_ai: data.ai_insights?.customer_base || '',
        risk_assessment: data.risk_assessment || '',
        strategic_recommendations: data.strategic_recommendations || '',
    };

    return (
        <DashboardErrorBoundary>
            <div className="pt-16">
                <DashboardNav />
                <main className="pt-6 pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-8" style={{ fontFamily: 'Inter, sans-serif' }}>

                    {/* Header + actions */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-[#2D2D2D]" style={TH}>Full Report</h1>
                            <p className="text-sm text-[#6B7280] mt-0.5">Generated on {date} · Analysis #{data.analysis_id || '—'}</p>
                        </div>
                        <button
                            onClick={handlePrint}
                            disabled={printing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#1d73c9] text-white text-sm font-bold rounded-lg hover:bg-[#155fa0] transition-all shadow-sm disabled:opacity-60"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                {printing ? 'hourglass_top' : 'print'}
                            </span>
                            {printing ? 'Printing…' : 'Download PDF'}
                        </button>
                    </div>

                    {/* Report preview card */}
                    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden shadow-sm">

                        {/* Cover strip */}
                        <div className="bg-[#111921] px-8 py-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-[#1d73c9]/15 rounded-full blur-[60px] -mr-16 -mt-16" />
                            <div className="relative z-10">
                                <p className="text-[#1d73c9] text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1d73c9]" />
                                    BIZMIND · AI BUSINESS LOCATION ANALYSIS
                                </p>
                                <h2 className="text-white text-3xl font-bold" style={TH}>{data.business_name}</h2>
                                <p className="text-slate-400 text-sm mt-1">{data.business_type} · {data.location}</p>
                                <div className="flex items-center gap-3 mt-4 flex-wrap">
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${recCls}`}>{recommendation}</span>
                                    <span className="text-xs text-slate-500 border border-slate-700 rounded-full px-3 py-1">
                                        {data.owner_type === 'new' ? 'New Entrepreneur' : 'Existing Business'}
                                    </span>
                                    <span className="text-xs text-slate-500 border border-slate-700 rounded-full px-3 py-1">
                                        {data.radius}m radius
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">

                            {/* Score summary row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Success Score', value: `${scorePct}%`, icon: 'verified' },
                                    { label: 'Competitors', value: data.competitors_count ?? data.competitors?.length ?? '—', icon: 'storefront' },
                                    { label: 'Avg Rating', value: data.avg_competitor_rating != null ? `${parseFloat(String(data.avg_competitor_rating)).toFixed(1)} ★` : '—', icon: 'star' },
                                    { label: 'Customer Score', value: data.customer_score ? `${data.customer_score}/100` : '—', icon: 'groups' },
                                ].map((m, i) => (
                                    <div key={i} className="bg-[#F9F9F8] border border-[#E5E5E5] rounded-xl p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{m.label}</p>
                                        <p className="text-xl font-bold text-[#1d73c9] mt-1" style={TH}>{m.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Sub-score bars */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-[#2D2D2D]" style={TH}>Score Breakdown</h3>
                                {[
                                    { l: 'Competition', v: features.competition_score ?? 0 },
                                    { l: 'Demand', v: features.demand_score ?? 0 },
                                    { l: 'Rating', v: features.rating_score ?? 0 },
                                    { l: 'Opportunity', v: features.opportunity_score ?? 0 },
                                ].map(s => (
                                    <div key={s.l} className="flex items-center gap-4">
                                        <span className="text-xs text-[#6B7280] w-24 shrink-0">{s.l}</span>
                                        <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#1d73c9] rounded-full" style={{ width: `${Math.round(s.v * 100)}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-[#2D2D2D] w-10 text-right">{Math.round(s.v * 100)}%</span>
                                    </div>
                                ))}
                            </div>

                            {/* Customer base */}
                            <div>
                                <h3 className="text-sm font-bold text-[#2D2D2D] mb-4" style={TH}>Customer Base</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { icon: 'apartment', label: 'Residential', val: data.apartments_count ?? 0 },
                                        { icon: 'school', label: 'Education', val: data.education_count ?? 0 },
                                        { icon: 'business', label: 'Offices', val: data.offices_count ?? 0 },
                                        { icon: 'directions_bus', label: 'Transit', val: data.transit_count ?? 0 },
                                    ].map((p) => (
                                        <div key={p.label} className="bg-[#F9F9F8] border border-[#E5E5E5] rounded-xl p-4 flex items-center gap-3">
                                            <span className="material-symbols-outlined text-[#1d73c9]" style={{ fontSize: '20px' }}>{p.icon}</span>
                                            <div>
                                                <p className="text-xl font-bold text-[#2D2D2D]" style={TH}>{p.val}</p>
                                                <p className="text-[10px] text-[#6B7280] font-medium">{p.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Competitors table */}
                            {((data.competitors?.length ?? 0) > 0) && (
                                <div>
                                    <h3 className="text-sm font-bold text-[#2D2D2D] mb-4" style={TH}>Nearby Competitors</h3>
                                    <div className="overflow-x-auto rounded-xl border border-[#E5E5E5]">
                                        <table className="w-full text-xs">
                                            <thead className="bg-[#F9F9F8] border-b border-[#E5E5E5]">
                                                <tr>
                                                    {['Name', 'Rating', 'Reviews', 'Distance'].map(h => (
                                                        <th key={h} className="text-left p-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(data.competitors ?? []).slice(0, 8).map((c, i) => (
                                                    <tr key={i} className="border-b border-[#F3F4F6] hover:bg-[#F9F9F8] transition-colors">
                                                        <td className="p-3 font-medium text-[#2D2D2D]">{c.name}</td>
                                                        <td className="p-3 text-amber-600 font-medium">{c.rating ? `${parseFloat(String(c.rating)).toFixed(1)} ★` : '—'}</td>
                                                        <td className="p-3 text-[#6B7280]">{c.reviews_count?.toLocaleString() || '—'}</td>
                                                        <td className="p-3 text-[#6B7280]">{c.distance_km ? `${c.distance_km} km` : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* AI Insight sections preview */}
                            <div>
                                <h3 className="text-sm font-bold text-[#2D2D2D] mb-4" style={TH}>AI-Generated Insights</h3>
                                <div className="space-y-4">
                                    {INSIGHT_SECTIONS.map(sec => {
                                        const content = contentMap[sec.key];
                                        if (!content || content === 'No data available') return null;
                                        return (
                                            <div key={sec.key} className="border-l-2 border-[#1d73c9] pl-4">
                                                <p className="text-xs font-bold text-[#2D2D2D] flex items-center gap-1.5 mb-2" style={TH}>
                                                    <span className="material-symbols-outlined text-[#1d73c9]" style={{ fontSize: '14px' }}>{sec.icon}</span>
                                                    {sec.label}
                                                </p>
                                                <div className="ai-insight-content" dangerouslySetInnerHTML={{ __html: formatInsight(content) }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="pt-4 border-t border-[#E5E5E5] grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                {[
                                    { l: 'Analysis ID', v: `#${data.analysis_id || '—'}` },
                                    { l: 'Generated', v: date },
                                    { l: 'Owner Type', v: data.owner_type === 'new' ? 'New Entrepreneur' : 'Existing Business' },
                                    { l: 'Search Radius', v: `${data.radius}m` },
                                    { l: 'Coordinates', v: data.latitude != null ? `${parseFloat(String(data.latitude)).toFixed(4)}, ${parseFloat(String(data.longitude ?? 0)).toFixed(4)}` : 'N/A' },
                                    { l: 'Total Reviews', v: features.total_reviews?.toLocaleString() ?? '—' },
                                ].map((m) => (
                                    <div key={m.l} className="bg-[#F9F9F8] border border-[#E5E5E5] rounded-lg p-3">
                                        <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold">{m.l}</p>
                                        <p className="font-bold text-[#2D2D2D] mt-0.5">{m.v}</p>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>

                </main>
            </div>
        </DashboardErrorBoundary>
    );
}
