"""
Revenue & Profit Simulation Engine
BizMind – Feature 1

Calculates monthly revenue forecast, cost breakdown, break-even analysis
and ROI% for Indian SMEs based on:
- Location tier (Metro / Tier-2 / Tier-3)
- Business type
- Competitor data (demand signal)
- Customer base score
"""

import re

# ─── Location tier detection ────────────────────────────────────────────────

METRO_CITIES = [
    "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad",
    "chennai", "kolkata", "pune", "ahmedabad", "surat"
]
TIER2_CITIES = [
    "jaipur", "lucknow", "kanpur", "nagpur", "indore", "thane", "bhopal",
    "visakhapatnam", "vizag", "pimpri", "patna", "vadodara", "ludhiana",
    "agra", "nashik", "faridabad", "meerut", "rajkot", "kalyan", "vasai",
    "coimbatore", "madurai", "jabalpur", "vijayawada", "srinagar",
    "amritsar", "allahabad", "prayagraj", "ranchi", "gwalior", "chandigarh",
    "hubli", "mysore", "tiruchirappalli", "bareilly", "aligarh", "moradabad",
    "tiruppur", "salem", "warangal", "thiruvananthapuram", "guntur", "kochi"
]

# Business type cost / revenue multipliers (relative to cafe baseline)
BUSINESS_PROFILES = {
    # category: (revenue_base_low, revenue_base_mid, revenue_base_high,
    #            cogs_pct, labor_pct, marketing_pct, misc_pct)
    "cafe":            (60000,  100000, 160000, 0.35, 0.18, 0.08, 0.05),
    "restaurant":      (80000,  150000, 250000, 0.40, 0.20, 0.06, 0.05),
    "food":            (70000,  120000, 200000, 0.40, 0.18, 0.07, 0.05),
    "grocery":         (100000, 180000, 300000, 0.60, 0.10, 0.04, 0.03),
    "retail":          (70000,  130000, 220000, 0.50, 0.12, 0.07, 0.04),
    "clothing":        (60000,  110000, 200000, 0.45, 0.12, 0.08, 0.04),
    "salon":           (50000,  80000,  130000, 0.20, 0.30, 0.08, 0.06),
    "salon / beauty":  (50000,  80000,  130000, 0.20, 0.30, 0.08, 0.06),
    "gym":             (60000,  100000, 160000, 0.10, 0.25, 0.10, 0.08),
    "pharmacy":        (120000, 200000, 320000, 0.55, 0.10, 0.03, 0.03),
    "electronics":     (100000, 180000, 300000, 0.55, 0.10, 0.05, 0.04),
    "bakery":          (50000,  90000,  150000, 0.38, 0.20, 0.07, 0.05),
    "tutoring":        (40000,  70000,  110000, 0.05, 0.35, 0.08, 0.05),
    "medical":         (80000,  150000, 250000, 0.25, 0.28, 0.05, 0.06),
    "clinic":          (80000,  150000, 250000, 0.25, 0.28, 0.05, 0.06),
    "stationery":      (30000,  55000,  90000,  0.45, 0.12, 0.05, 0.04),
    "default":         (60000,  100000, 160000, 0.40, 0.18, 0.07, 0.05),
}

# Location tier multipliers  [rent_sqft, revenue_multiplier, labor_multiplier]
TIER_PARAMS = {
    "metro":  {"rent_sqft": 150, "rev_mul": 1.50, "labor_mul": 1.40},
    "tier2":  {"rent_sqft": 80,  "rev_mul": 1.00, "labor_mul": 1.00},
    "tier3":  {"rent_sqft": 40,  "rev_mul": 0.65, "labor_mul": 0.75},
}

# Default shop sizes (sq.ft.) and # employees per business type
SHOP_DEFAULTS = {
    "cafe":            (250, 4),
    "restaurant":      (400, 6),
    "food":            (300, 5),
    "grocery":         (500, 3),
    "retail":          (300, 3),
    "clothing":        (350, 3),
    "salon":           (200, 3),
    "salon / beauty":  (200, 3),
    "gym":             (800, 4),
    "pharmacy":        (250, 2),
    "electronics":     (300, 3),
    "bakery":          (200, 4),
    "tutoring":        (400, 2),
    "medical":         (300, 3),
    "clinic":          (300, 3),
    "stationery":      (200, 2),
    "default":         (300, 3),
}

ELECTRICITY_PER_SQFT = 8   # ₹/sq.ft/month (rough Indian average)
MISC_FIXED = 5000           # ₹ miscellaneous fixed costs

SEASONALITY_PROFILES = {
    # Jan - Dec multipliers
    "cafe":       [1.0, 1.0, 1.1, 1.2, 1.3, 1.2, 1.0, 0.9, 0.9, 1.0, 1.1, 1.2], # Summer & Winter peaks
    "restaurant": [1.0, 1.0, 1.0, 1.0, 1.1, 1.1, 0.9, 0.9, 1.0, 1.2, 1.3, 1.3], # Festive peaks
    "retail":     [0.8, 0.8, 0.9, 0.9, 1.0, 1.0, 0.9, 0.9, 1.1, 1.3, 1.4, 1.2], # Diwali / Festive
    "clothing":   [0.8, 0.8, 0.9, 0.9, 1.0, 1.0, 0.9, 0.9, 1.1, 1.3, 1.4, 1.2],
    "grocery":    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.1, 1.1, 1.1], # Stable
    "gym":        [1.3, 1.2, 1.1, 1.0, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9], # New Year resolutions
    "default":    [1.0] * 12
}

def _get_seasonality(business_type: str) -> list:
    bt = business_type.lower()
    for key, curve in SEASONALITY_PROFILES.items():
        if key in bt:
            return curve
    return SEASONALITY_PROFILES["default"]


def _detect_tier(location: str) -> str:
    loc = location.lower()
    for city in METRO_CITIES:
        if city in loc:
            return "metro"
    for city in TIER2_CITIES:
        if city in loc:
            return "tier2"
    return "tier3"


def _get_profile(business_type: str) -> tuple:
    bt = business_type.lower()
    for key in BUSINESS_PROFILES:
        if key in bt or bt in key:
            return BUSINESS_PROFILES[key]
    return BUSINESS_PROFILES["default"]


def _get_shop_defaults(business_type: str) -> tuple:
    bt = business_type.lower()
    for key in SHOP_DEFAULTS:
        if key in bt or bt in key:
            return SHOP_DEFAULTS[key]
    return SHOP_DEFAULTS["default"]


class RevenueEngine:
    """
    Simulates revenue, costs, profit and break-even for an Indian SME.
    """

    def simulate(
        self,
        business_type: str,
        location: str,
        features: dict,
        customer_base: dict,
        shop_size_sqft: int = None,
        num_employees: int = None,
        initial_investment: float = None
    ) -> dict:
        """
        Run full revenue simulation.

        Args:
            business_type:      e.g. "Cafe", "Grocery Store"
            location:           Location string for tier detection
            features:           dict from feature_engineering (demand_score, success_score, …)
            customer_base:      dict from customer base analysis (customer_score, …)
            shop_size_sqft:     Override shop size (optional)
            num_employees:      Override employee count (optional)
            initial_investment: Total money put in (optional, used for ROI)

        Returns:
            dict with full simulation results
        """
        tier = _detect_tier(location)
        tier_params = TIER_PARAMS[tier]

        profile = _get_profile(business_type)
        rev_low_base, rev_mid_base, rev_high_base, cogs_pct, labor_pct, mkt_pct, misc_pct = profile

        default_sqft, default_emp = _get_shop_defaults(business_type)
        sqft      = shop_size_sqft  or default_sqft
        employees = num_employees    or default_emp

        # ── Revenue adjustment by demand + customer score ──────────────────
        demand_mul = 0.8 + features.get("demand_score", 0.5) * 0.6   # 0.8–1.4
        customer_mul = 1.0 + (customer_base.get("customer_score", 50) - 50) / 200  # ±0.25

        rev_mul = tier_params["rev_mul"] * demand_mul * customer_mul

        implied_daily_revenue = (rev_mid_base * rev_mul) / 30

        # Define an assumed average ticket size per customer in this tier
        ticket_size_map = {
            "cafe": {"metro": 350, "tier2": 200, "tier3": 120},
            "restaurant": {"metro": 600, "tier2": 350, "tier3": 200},
            "grocery": {"metro": 400, "tier2": 250, "tier3": 150},
            "bakery": {"metro": 250, "tier2": 150, "tier3": 100},
            "salon": {"metro": 500, "tier2": 300, "tier3": 150},
        }
        
        bt = business_type.lower()
        bt_key = "default"
        for key in ticket_size_map:
            if key in bt:
                bt_key = key
                break
        
        avg_ticket = ticket_size_map.get(bt_key, {"metro": 300, "tier2": 180, "tier3": 100})[tier]
        
        # Calculate expected daily organic footfall explicitly from geographical data
        apartments = customer_base.get('apartments_count', 0)
        transit = customer_base.get('transit_count', 0)
        offices = customer_base.get('offices_count', 0)
        education = customer_base.get('education_count', 0)
        
        # Organic conversion logic (1 in 20 apartments visits, 1 in 5 transit visits)
        organic_footfall = (apartments * 0.05) + (transit * 5) + (offices * 3) + (education * 2)
        organic_footfall = max(organic_footfall, 10.0) # Absolute minimum baseline
        
        # Blend Profile Baseline with Organic Footfall to get finalized Daily Customers
        implied_customers = implied_daily_revenue / avg_ticket
        # Weight demographic data 40%, historical profile 60%
        blended_customers = (implied_customers * 0.6) + (organic_footfall * 0.4)
        
        monthly_rev_mid = round(blended_customers * avg_ticket * 30, -3)
        monthly_rev_low = round(monthly_rev_mid * 0.7, -3)
        monthly_rev_high = round(monthly_rev_mid * 1.5, -3)

        # ── Monthly costs (based on mid revenue scenario) ─────────────────
        rent = round(tier_params["rent_sqft"] * sqft, -2)

        # Regional min-wage guess (₹/month per employee)
        base_wage = {"metro": 18000, "tier2": 12000, "tier3": 8000}[tier]
        salaries  = round(base_wage * tier_params["labor_mul"] * employees, -2)

        inventory = round(monthly_rev_mid * cogs_pct, -2)
        marketing = round(monthly_rev_mid * mkt_pct, -2)
        electricity = round(ELECTRICITY_PER_SQFT * sqft, -2)
        misc       = round(monthly_rev_mid * misc_pct + MISC_FIXED, -2)

        total_monthly_costs = rent + salaries + inventory + marketing + electricity + misc

        # ── Profit scenarios ───────────────────────────────────────────────
        profit_low  = monthly_rev_low  - total_monthly_costs
        profit_mid  = monthly_rev_mid  - total_monthly_costs
        profit_high = monthly_rev_high - total_monthly_costs

        # ── Break-even (months) ───────────────────────────────────────────
        # Estimate initial investment if not provided
        if not initial_investment:
            initial_investment = total_monthly_costs * 3  # 3-month working capital
            initial_investment += sqft * 500              # fit-out ₹500/sqft estimate

        if profit_mid > 0:
            break_even_months = round(initial_investment / profit_mid, 1)
        else:
            break_even_months = None  # Never (loss-making at mid scenario)

        # ── 12-month projection (mid scenario, ramp-up in first 3 months) ──
        seasonality = _get_seasonality(business_type)
        monthly_projection = []
        for month in range(1, 13):
            ramp = 0.5 + 0.5 * min(month / 3, 1.0)   # 50%→100% in 3 months
            season_mul = seasonality[month - 1]
            rev  = round(monthly_rev_mid  * ramp * season_mul, 0)
            cost = round(total_monthly_costs * (0.9 + 0.1 * min(month / 2, 1.0)), 0)
            monthly_projection.append({
                "month": month,
                "revenue": int(rev),
                "costs":   int(cost),
                "profit":  int(rev - cost)
            })

        # ── ROI % (annualised, mid scenario) ─────────────────────────────
        annual_profit = profit_mid * 12
        roi_pct = round((annual_profit / initial_investment) * 100, 1) if initial_investment else 0

        return {
            "tier":               tier.capitalize(),
            "shop_size_sqft":     sqft,
            "num_employees":      employees,
            "initial_investment": int(initial_investment),
            "monthly_revenue": {
                "low":  int(monthly_rev_low),
                "mid":  int(monthly_rev_mid),
                "high": int(monthly_rev_high)
            },
            "monthly_costs": {
                "rent":        int(rent),
                "salaries":    int(salaries),
                "inventory":   int(inventory),
                "marketing":   int(marketing),
                "electricity": int(electricity),
                "misc":        int(misc),
                "total":       int(total_monthly_costs)
            },
            "monthly_profit": {
                "low":  int(profit_low),
                "mid":  int(profit_mid),
                "high": int(profit_high)
            },
            "break_even_months": break_even_months,
            "roi_pct":           roi_pct,
            "twelve_month_projection": monthly_projection,
            "daily_footfall": int(blended_customers),
            "avg_ticket": int(avg_ticket)
        }
