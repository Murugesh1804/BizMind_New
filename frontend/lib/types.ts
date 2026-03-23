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

export interface TopCompetitor {
    name: string;
    rating: string | number;
    distance?: string | number;
}

export interface PreviewResult {
    preview: boolean;
    competitor_count: number;
    competition_level: string;
    avg_rating: number;
    demand_level: string;
    success_score: number;
    customer_score: number;
    heatmap_data: Array<{ lat: number; lng: number }>;
    ai_opinion: string;
    top_competitors: Array<TopCompetitor>;
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
    market_gaps?: string;
    msme_schemes?: string;
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

export interface MarketingIntel {
    channels_table?: string;
    ad_spend?: string;
    cac_estimate?: string;
    community_tactics?: string;
    content_strategy?: string;
    full_plan?: string;
    influencers?: Array<{ handle: string; platform: string; url: string; contact: string }>;
}

export interface GovScheme {
    name: string;
    description: string;
    url: string;
    state?: string;
    category?: string;
}

export interface RevenueSimulation {
    tier: string;
    monthly_revenue: { low: number; mid: number; high: number };
    monthly_costs: Record<string, number>;
    monthly_profit: { low: number; mid: number; high: number };
    break_even_months: number | null;
    roi_pct: number;
    twelve_month_projection: Array<{ month: number; revenue: number; costs: number; profit: number }>;
    daily_footfall: number;
    avg_ticket: number;
    initial_investment: number;
}

export interface CostBreakdown {
    tier: string;
    one_time_costs: Record<string, number>;
    monthly_costs: Record<string, number>;
}

export interface AnalysisResult extends CustomerBaseData {
    // Core identification  
    id: number;          // The DB primary key - used for API calls
    analysis_id?: number;
    user_id?: number;

    // Business info
    business_name: string;
    business_type: string;
    location: string;
    radius: number;
    owner_type: 'new' | 'existing';
    budget?: number;

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

    // New Feature Data
    customer_persona?: Record<string, any>;
    cost_breakdown?: CostBreakdown;
    revenue_simulation?: RevenueSimulation;
    launch_strategy?: Record<string, string>;
    marketing_intel?: MarketingIntel;
    gov_schemes_list?: GovScheme[];
    target_launch_date?: string;
    action_items_json?: string;

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
