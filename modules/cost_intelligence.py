"""
Real-Time Cost Intelligence Module
BizMind – Feature 3

Estimates key startup and operational costs for Indian SMEs:
- Commercial rent (per sq.ft, location-tier based)
- Electricity costs
- Labor / salary costs (region-adjusted)
- Initial inventory estimate
- Total setup cost

Since no free real-time Indian commercial real-estate API exists,
estimates are heuristic-based and clearly labelled as "estimated".
"""

from modules.revenue_engine import (
    _detect_tier, _get_shop_defaults, TIER_PARAMS,
    ELECTRICITY_PER_SQFT, MISC_FIXED
)

# Fit-out cost per sq.ft by business type (one-time)
FITOUT_COST = {
    "cafe":            1200,
    "restaurant":      1500,
    "food":            1200,
    "grocery":         600,
    "retail":          800,
    "clothing":        900,
    "salon":           1000,
    "salon / beauty":  1000,
    "gym":             2000,
    "pharmacy":        700,
    "electronics":     800,
    "bakery":          1100,
    "tutoring":        500,
    "medical":         1500,
    "clinic":          1500,
    "stationery":      500,
    "default":         900,
}

# Initial inventory estimate as multiple of monthly inventory cost
INVENTORY_MONTHS = {
    "grocery":    2.0,
    "pharmacy":   1.5,
    "electronics":2.0,
    "clothing":   2.0,
    "retail":     1.5,
    "default":    1.0,
}


def _get_fitout(business_type: str) -> int:
    bt = business_type.lower()
    for key in FITOUT_COST:
        if key in bt or bt in key:
            return FITOUT_COST[key]
    return FITOUT_COST["default"]


def _get_inventory_months(business_type: str) -> float:
    bt = business_type.lower()
    for key in INVENTORY_MONTHS:
        if key in bt:
            return INVENTORY_MONTHS[key]
    return INVENTORY_MONTHS["default"]


class CostIntelligence:
    """
    Estimates operational and setup costs for a business in a given location.
    """

    def estimate(
        self,
        business_type: str,
        location: str,
        shop_size_sqft: int = None,
        num_employees: int = None
    ) -> dict:
        """
        Estimate all cost components.

        Returns:
            dict with monthly costs, setup costs, and cost breakdown
        """
        tier        = _detect_tier(location)
        tier_params = TIER_PARAMS[tier]

        default_sqft, default_emp = _get_shop_defaults(business_type)
        sqft      = shop_size_sqft or default_sqft
        employees = num_employees  or default_emp

        # ── Monthly operating costs ────────────────────────────────────────
        rent_per_sqft = tier_params["rent_sqft"]
        monthly_rent  = round(rent_per_sqft * sqft, -2)

        base_wage = {"metro": 18000, "tier2": 12000, "tier3": 8000}[tier]
        monthly_salaries = round(base_wage * tier_params["labor_mul"] * employees, -2)

        monthly_electricity = round(ELECTRICITY_PER_SQFT * sqft, -2)

        # Rough inventory for reference (business type dependent)
        from modules.revenue_engine import BUSINESS_PROFILES, _get_profile
        profile = _get_profile(business_type)
        _, rev_mid_base, _, cogs_pct, _, mkt_pct, misc_pct = profile
        rev_mid = rev_mid_base * tier_params["rev_mul"]
        monthly_inventory = round(rev_mid * cogs_pct, -2)
        monthly_marketing  = round(rev_mid * mkt_pct, -2)
        monthly_misc       = round(rev_mid * misc_pct + MISC_FIXED, -2)

        total_monthly = (
            monthly_rent + monthly_salaries + monthly_electricity +
            monthly_inventory + monthly_marketing + monthly_misc
        )

        # ── One-time setup costs ───────────────────────────────────────────
        fitout_per_sqft  = _get_fitout(business_type)
        fitout_cost      = round(fitout_per_sqft * sqft, -3)
        initial_inventory = round(monthly_inventory * _get_inventory_months(business_type), -3)
        security_deposit  = monthly_rent * 3  # typically 3 months
        equipment_cost    = round(fitout_cost * 0.3, -3)  # rough equipment within fit-out

        total_setup = fitout_cost + initial_inventory + security_deposit + equipment_cost

        return {
            "location_tier":     tier.capitalize(),
            "shop_size_sqft":    sqft,
            "num_employees":     employees,
            "rent_per_sqft":     int(rent_per_sqft),
            "monthly_costs": {
                "rent":          int(monthly_rent),
                "salaries":      int(monthly_salaries),
                "electricity":   int(monthly_electricity),
                "inventory":     int(monthly_inventory),
                "marketing":     int(monthly_marketing),
                "misc":          int(monthly_misc),
                "total":         int(total_monthly)
            },
            "setup_costs": {
                "fitout":            int(fitout_cost),
                "initial_inventory": int(initial_inventory),
                "security_deposit":  int(security_deposit),
                "equipment":         int(equipment_cost),
                "total":             int(total_setup)
            },
            "note": "All figures are estimated based on location tier and business type. Actual costs may vary."
        }
