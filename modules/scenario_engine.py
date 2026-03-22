"""
What-If Scenario Engine
BizMind – Feature 8

Simulates the effect of changing one business parameter on profit/loss.
Scenarios supported:
- price_change_pct    : revenue changes proportionally (e.g. -10% price → -10% revenue if demand elastic)
- rent_change_pct     : monthly rent changes by %
- employee_change     : +/- number of employees
- marketing_boost_pct : increase marketing spend by %, revenue increases moderately
- target_premium      : switch to premium positioning (+30% revenue, +15% cost)
"""


class ScenarioEngine:
    """
    Applies a what-if scenario on top of a base revenue simulation result.
    """

    SUPPORTED_SCENARIOS = [
        "price_change_pct",
        "rent_change_pct",
        "employee_change",
        "marketing_boost_pct",
        "target_premium",
    ]

    def run(self, base_simulation: dict, scenario: dict) -> dict:
        """
        Apply a what-if scenario to a base revenue simulation.

        Args:
            base_simulation: Output from RevenueEngine.simulate()
            scenario: dict with ONE of the supported scenario keys + value
                e.g. {"price_change_pct": -10}

        Returns:
            dict with before/after comparison
        """
        # Deep copy the base cost and revenue structures
        base_rev   = base_simulation["monthly_revenue"]["mid"]
        base_costs = dict(base_simulation["monthly_costs"])
        base_profit = base_simulation["monthly_profit"]["mid"]
        initial_inv = base_simulation["initial_investment"]

        scenario_key   = None
        scenario_value = None
        for key in self.SUPPORTED_SCENARIOS:
            if key in scenario:
                scenario_key   = key
                scenario_value = scenario[key]
                break

        if not scenario_key:
            return {"error": "No valid scenario key provided", "supported": self.SUPPORTED_SCENARIOS}

        # ── Apply scenario ────────────────────────────────────────────────
        new_rev   = base_rev
        new_costs = dict(base_costs)
        description = ""

        if scenario_key == "price_change_pct":
            pct = float(scenario_value)
            # Price elasticity: assume 70% pass-through to revenue (some customers lost)
            new_rev = round(base_rev * (1 + pct / 100 * 0.7))
            description = f"Price {'increased' if pct > 0 else 'decreased'} by {abs(pct):.0f}%"

        elif scenario_key == "rent_change_pct":
            pct = float(scenario_value)
            new_costs["rent"]  = round(base_costs["rent"] * (1 + pct / 100))
            new_costs["total"] = sum(v for k, v in new_costs.items() if k != "total")
            description = f"Rent {'increased' if pct > 0 else 'decreased'} by {abs(pct):.0f}%"

        elif scenario_key == "employee_change":
            count = int(scenario_value)
            salary_per_emp = base_costs["salaries"] / max(base_simulation["num_employees"], 1)
            new_costs["salaries"] = max(0, round(base_costs["salaries"] + salary_per_emp * count))
            new_costs["total"]    = sum(v for k, v in new_costs.items() if k != "total")
            action = "Added" if count > 0 else "Removed"
            description = f"{action} {abs(count)} employee(s)"

        elif scenario_key == "marketing_boost_pct":
            pct = float(scenario_value)
            extra_mkt = round(base_costs["marketing"] * pct / 100)
            new_costs["marketing"] += extra_mkt
            new_costs["total"]      = sum(v for k, v in new_costs.items() if k != "total")
            # Revenue uplift: 0.4× marketing spend increase (typical Indian SME ROI)
            new_rev = round(base_rev + extra_mkt * 0.4)
            description = f"Marketing spend increased by {pct:.0f}%"

        elif scenario_key == "target_premium":
            # Premium shift: +30% revenue, +15% costs (better quality)
            new_rev   = round(base_rev * 1.30)
            new_costs = {k: round(v * 1.15) if k != "total" else 0 for k, v in base_costs.items()}
            new_costs["total"] = sum(v for k, v in new_costs.items() if k != "total")
            description = "Shifted to premium customer targeting"

        # ── New total cost ────────────────────────────────────────────────
        if "total" not in new_costs or new_costs["total"] == 0:
            new_costs["total"] = sum(v for k, v in new_costs.items() if k != "total")

        new_profit = new_rev - new_costs["total"]

        # ── Break-even recalculation ───────────────────────────────────────
        if new_profit > 0:
            new_break_even = round(initial_inv / new_profit, 1)
        else:
            new_break_even = None

        profit_delta     = new_profit - base_profit
        profit_delta_pct = round((profit_delta / abs(base_profit)) * 100, 1) if base_profit != 0 else 0

        # Calculate success score impact
        score_change = 0.0
        if profit_delta_pct >= 20:
            score_change = 1.0
        elif profit_delta_pct >= 10:
            score_change = 0.5
        elif profit_delta_pct <= -20:
            score_change = -1.0
        elif profit_delta_pct <= -10:
            score_change = -0.5

        return {
            "scenario_applied": description,
            "before": {
                "monthly_revenue": int(base_rev),
                "monthly_costs":   int(base_costs["total"]),
                "monthly_profit":  int(base_profit),
                "break_even_months": base_simulation.get("break_even_months")
            },
            "after": {
                "monthly_revenue": int(new_rev),
                "monthly_costs":   int(new_costs["total"]),
                "monthly_profit":  int(new_profit),
                "break_even_months": new_break_even,
                "cost_breakdown":  {k: int(v) for k, v in new_costs.items()}
            },
            "impact": {
                "profit_change":     int(profit_delta),
                "profit_change_pct": profit_delta_pct,
                "success_score_delta": score_change,
                "verdict": (
                    "✅ Positive impact" if profit_delta > 0
                    else "❌ Negative impact" if profit_delta < 0
                    else "➡️ Neutral"
                )
            }
        }
