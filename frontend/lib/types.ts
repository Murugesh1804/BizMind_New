/**
 * Shared TypeScript types for BizMind
 * Replaces all `any` usage across dashboard pages with strongly-typed interfaces
 */

export interface CompetitorData {
    name: string;
    rating: string | number;
    reviews_count: number;
    address: string;
    distance_km?: string | number;
    website?: string;
    phone?: string;
}

export interface FeatureData {
    competitor_count: number;
    avg_rating: number;
    total_reviews: number;
    avg_reviews_per_competitor: number;
    competition_score: number;
    rating_score: number;
    demand_score: number;
    opportunity_score: number;
    success_score: number;
    recommendation: string;
    competition_level: 'Low' | 'Moderate' | 'High';
    demand_level: 'Low' | 'Moderate' | 'High';
}

export interface AiInsights {
    sentiment?: string;
    opportunity?: string;
    pricing?: string;
    customer_base?: string;
    risks?: string;
    recommendations?: string;
    full_analysis?: string;
}

export interface CustomerBaseData {
    apartments_count: number;
    education_count: number;
    offices_count: number;
    transit_count: number;
    customer_score: number;
    heatmap_data?: Array<{ lat: number; lng: number }>;
}

export interface HeatmapPoint {
    lat: number;
    lng: number;
}

export interface AnalysisResult extends CustomerBaseData {
    // Core identification
    analysis_id?: number;
    user_id?: number;

    // Business info
    business_name: string;
    business_type: string;
    location: string;
    radius: number;
    owner_type: 'new' | 'existing';

    // Geolocation
    latitude?: string | number;
    longitude?: string | number;

    // Score
    success_score: number;
    recommendation?: string;

    // Detailed data
    features?: FeatureData;
    competitors?: CompetitorData[];
    ai_insights?: AiInsights;
    heatmap_data?: HeatmapPoint[];

    // Competitor aggregates
    competitors_count?: number;
    avg_competitor_rating?: string | number;

    // AI Insight sections (top-level flattened by backend)
    competitive_landscape?: string;
    customer_insights?: string;
    pricing_insights?: string;
    risk_assessment?: string;
    strategic_recommendations?: string;
    market_analysis?: string;

    // Timestamps
    created_at?: string;
    updated_at?: string;
}

export interface HistoryEntry {
    id: number;
    business_name: string;
    business_type: string;
    location: string;
    success_score: number;
    created_at: string;
}

export interface AuthUser {
    id: number;
    email: string;
    full_name: string;
}
