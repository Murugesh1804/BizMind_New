'use client';
import { useState } from 'react';

interface HelpTooltipProps {
    term: string;
    explanation: string;
    children?: React.ReactNode;
}

export default function HelpTooltip({ term, explanation, children }: HelpTooltipProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <span className="relative inline-block">
            {children || (
                <button
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip(!showTooltip)}
                    className="inline-flex items-center gap-1 text-gray-500 hover:text-primary transition-colors cursor-help"
                >
                    {term}
                    <span className="material-symbols-outlined text-[16px] text-gray-400">help_outline</span>
                </button>
            )}
            {showTooltip && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                    <p className="leading-relaxed">{explanation}</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>
            )}
        </span>
    );
}

// Predefined explanations for common confusing terms
export const explanations = {
    successScore: "Our AI rates this location 1-10 based on competition density, customer demand, and foot traffic potential. Higher is better.",
    cooCopilot: "AI assistant that answers your business questions, analyzes your data, and suggests improvements. Like having a Chief Operating Officer on demand.",
    heatmap: "Visual representation showing where your potential customers live and work. Red areas = high customer density, Blue = low.",
    customerScore: "Measures how well the area matches your target customer demographic based on income, age, and lifestyle data.",
    competitorCount: "Total number of similar businesses found within your selected radius. Doesn't necessarily mean bad - validates market demand.",
    abCompare: "Compare up to 3 different locations side-by-side to find the best spot for your business. See metrics for each location.",
    revenueForecast: "AI prediction of your potential monthly and yearly revenue based on location data, market trends, and similar businesses.",
    demandLevel: "How much local customers are searching for businesses like yours. High demand + low competition = opportunity.",
    learningLoop: "Give us feedback about your analysis and suggest improvements. Help us make BizMind better for all entrepreneurs.",
    livePulse: "Real-time monitoring of market changes near your location - new competitors opening, demand shifts, and trends.",
};
