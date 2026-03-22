"""
Ideal Customer Persona Engine
BizMind – Feature 2

Derives the ideal customer persona from customer base indicators:
- Age group / segment (students, working professionals, families)
- Income level estimate (low / mid / high)
- Spending capacity
- Lifestyle patterns

All based on: apartments_count, education_count, offices_count, transit_count
and the broader location context.
"""


class PersonaEngine:
    """
    Builds an ideal customer persona from customer base data and location info.
    """

    def generate_persona(
        self,
        customer_base: dict,
        business_type: str,
        location: str,
        features: dict
    ) -> dict:
        """
        Generate a customer persona.

        Args:
            customer_base:  dict from fetch_customer_base_data()
            business_type:  e.g. "Cafe"
            location:       Location string
            features:       feature_engineering output (demand_score, etc.)

        Returns:
            dict with persona details + summary string
        """
        apartments  = customer_base.get("apartments_count",  0)
        education   = customer_base.get("education_count",   0)
        offices     = customer_base.get("offices_count",     0)
        transit     = customer_base.get("transit_count",     0)
        cust_score  = customer_base.get("customer_score",    0)

        # ── Determine dominant segments (can be multiple) ─────────────────
        scores = {
            "Students / Youth (18–25)":              education * 3,
            "Working Professionals (26–40)":          offices   * 3 + transit * 1,
            "Families & Residents":                   apartments * 2,
            "Commuters & Transit Users":              transit   * 2,
        }
        sorted_segments = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        primary_segment   = sorted_segments[0][0] if sorted_segments[0][1] > 0 else "Mixed General Public"
        secondary_segment = sorted_segments[1][0] if len(sorted_segments) > 1 and sorted_segments[1][1] > 0 else None

        # ── Income level ─────────────────────────────────────────────────
        if offices > 5 or location.lower() in ["bangalore", "mumbai", "delhi", "hyderabad", "pune"]:
            income_level   = "Mid to High Income"
            spending_power = "High – willing to pay for quality & convenience"
            price_tag      = "₹150–₹500 per transaction"
        elif education > 5 or apartments > 10:
            income_level   = "Low to Mid Income"
            spending_power = "Moderate – price-sensitive, value-seekers"
            price_tag      = "₹50–₹200 per transaction"
        else:
            income_level   = "Mixed Income"
            spending_power = "Varied – offer both budget and mid-range options"
            price_tag      = "₹80–₹300 per transaction"

        # ── Lifestyle patterns ────────────────────────────────────────────
        lifestyle_tags = []
        if education > 3:
            lifestyle_tags.append("Quick bites & affordable meals")
            lifestyle_tags.append("Study / hangout spaces")
        if offices > 3:
            lifestyle_tags.append("Productivity-focused, time-starved")
            lifestyle_tags.append("Weekday lunch / after-work visits")
        if apartments > 5:
            lifestyle_tags.append("Weekend family outings")
            lifestyle_tags.append("Convenience-first shopping")
        if transit > 2:
            lifestyle_tags.append("On-the-go consumption")
            lifestyle_tags.append("High footfall, impulse purchases")

        if not lifestyle_tags:
            lifestyle_tags = ["General daily-use purchase patterns"]

        # ── Peak hours ────────────────────────────────────────────────────
        peak_hours = []
        if "Students" in primary_segment:
            peak_hours = ["8–10 AM (morning rush)", "12–2 PM (lunch break)", "4–7 PM (post-college)"]
        elif "Working Professionals" in primary_segment:
            peak_hours = ["8–10 AM (before work)", "1–2 PM (lunch)", "6–8 PM (after work)"]
        elif "Families" in primary_segment:
            peak_hours = ["10 AM–12 PM (morning errands)", "5–8 PM (evening)", "Weekends all day"]
        else:
            peak_hours = ["12–2 PM", "5–8 PM"]

        # ── Summary string ────────────────────────────────────────────────
        primary_label = primary_segment.split("(")[0].strip()
        summary = (
            f"This area is best suited for: **{primary_label}** "
            f"with **{income_level}** and {spending_power.lower()}. "
            f"Typical spend: {price_tag}."
        )

        return {
            "primary_segment":   primary_segment,
            "secondary_segment": secondary_segment,
            "income_level":      income_level,
            "spending_power":    spending_power,
            "typical_spend":     price_tag,
            "lifestyle_tags":    lifestyle_tags,
            "peak_hours":        peak_hours,
            "summary":           summary,
            "area_profile": {
                "apartments":  apartments,
                "education":   education,
                "offices":     offices,
                "transit":     transit,
                "score":       cust_score
            }
        }
