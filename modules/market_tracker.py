"""
Live Market Tracking Module
BizMind – Feature 5

Re-fetches competitor data for a saved analysis location and compares
against the last stored snapshot to generate alerts:
- New competitors entered the area
- Competitor ratings changed significantly
- Review volume (demand) shifted
- Opportunity signals (new market gaps)
"""

import json
from datetime import datetime


class MarketTracker:
    """
    Generates market change alerts by diffing fresh data vs stored snapshots.
    """

    RATING_CHANGE_THRESHOLD  = 0.3   # Stars
    DEMAND_CHANGE_THRESHOLD  = 0.15  # 15% change in review volume
    NEW_COMPETITOR_THRESHOLD = 1     # Alert if 1+ new competitor appears

    def generate_snapshot(self, competitors: list, features: dict) -> dict:
        """
        Build a snapshot dict from current competitor data.
        """
        return {
            "timestamp":       datetime.now().isoformat(),
            "competitor_count": len(competitors),
            "avg_rating":       features.get("avg_rating", 0),
            "total_reviews":    features.get("total_reviews", 0),
            "demand_score":     features.get("demand_score", 0),
            "competitor_names": [c.get("name", "") for c in competitors],
            "top_rated":        max((c.get("rating", 0) for c in competitors), default=0),
        }

    def generate_alerts(
        self,
        old_snapshot: dict,
        new_snapshot: dict,
        analysis: dict
    ) -> list:
        """
        Compare old vs new snapshot and return list of alert dicts.

        Args:
            old_snapshot: Previously stored snapshot
            new_snapshot: Freshly generated snapshot
            analysis:     The original analysis object (for context)

        Returns:
            list of alert dicts: {type, severity, title, message, emoji}
        """
        alerts = []
        location = analysis.get("location", "your area")
        biz_type = analysis.get("business_type", "your business")

        old_count   = old_snapshot.get("competitor_count",  0)
        new_count   = new_snapshot.get("competitor_count",  0)
        old_rating  = old_snapshot.get("avg_rating",        0)
        new_rating  = new_snapshot.get("avg_rating",        0)
        old_reviews = old_snapshot.get("total_reviews",     0)
        new_reviews = new_snapshot.get("total_reviews",     0)

        # ── New competitors ─────────────────────────────────────────────────
        delta_competitors = new_count - old_count
        if delta_competitors >= self.NEW_COMPETITOR_THRESHOLD:
            new_names = [n for n in new_snapshot.get("competitor_names", [])
                         if n not in old_snapshot.get("competitor_names", [])]
            names_str = ", ".join(new_names[:3]) if new_names else f"{delta_competitors} new"
            alerts.append({
                "type":     "new_competitor",
                "severity": "warning",
                "emoji":    "🆕",
                "title":    f"{delta_competitors} New Competitor(s) Detected",
                "message":  f"{names_str} entered the {location} market for {biz_type}. Review their strategy.",
            })
        elif delta_competitors < 0:
            alerts.append({
                "type":     "competitor_closed",
                "severity": "opportunity",
                "emoji":    "🟢",
                "title":    f"{abs(delta_competitors)} Competitor(s) Closed",
                "message":  f"Potential gap opened in the market — opportunity to capture their customers.",
            })

        # ── Rating change ────────────────────────────────────────────────────
        rating_delta = new_rating - old_rating
        if abs(rating_delta) >= self.RATING_CHANGE_THRESHOLD:
            if rating_delta < 0:
                alerts.append({
                    "type":     "rating_drop",
                    "severity": "opportunity",
                    "emoji":    "📉",
                    "title":    f"Competitor Ratings Dropped ({rating_delta:+.1f}★)",
                    "message":  f"Average competitor rating fell from {old_rating:.1f} to {new_rating:.1f}. Customer dissatisfaction rising — opportunity to stand out on quality.",
                })
            else:
                alerts.append({
                    "type":     "rating_rise",
                    "severity": "warning",
                    "emoji":    "📈",
                    "title":    f"Competitor Ratings Improved ({rating_delta:+.1f}★)",
                    "message":  f"Average competitor rating rose from {old_rating:.1f} to {new_rating:.1f}. Raise your own quality standards to stay competitive.",
                })

        # ── Demand change (review volume proxy) ──────────────────────────────
        if old_reviews > 0:
            demand_change_pct = (new_reviews - old_reviews) / old_reviews
            if demand_change_pct >= self.DEMAND_CHANGE_THRESHOLD:
                alerts.append({
                    "type":     "demand_surge",
                    "severity": "opportunity",
                    "emoji":    "🔥",
                    "title":    f"Demand Surging (+{demand_change_pct*100:.0f}%)",
                    "message":  f"Review volume jumped from {old_reviews} to {new_reviews}. Area is getting busier — good time to ramp up marketing.",
                })
            elif demand_change_pct <= -self.DEMAND_CHANGE_THRESHOLD:
                alerts.append({
                    "type":     "demand_drop",
                    "severity": "warning",
                    "emoji":    "⚠️",
                    "title":    f"Demand Slowing ({demand_change_pct*100:.0f}%)",
                    "message":  f"Review volume dropped from {old_reviews} to {new_reviews}. Consider expanding to adjacent areas or boosting online presence.",
                })

        # ── No significant changes ────────────────────────────────────────────
        if not alerts:
            alerts.append({
                "type":     "stable",
                "severity": "info",
                "emoji":    "✅",
                "title":    "Market Stable",
                "message":  f"No significant changes detected in {location} since last snapshot.",
            })

        return alerts

    def diff_and_alert(
        self,
        old_snapshot_json: str,
        competitors: list,
        features: dict,
        analysis: dict
    ) -> dict:
        """
        Full pipeline: build new snapshot, diff, return alerts + new snapshot.

        Args:
            old_snapshot_json: JSON string of previous snapshot (from DB)
            competitors:       Fresh competitor list from Google Maps
            features:          Fresh feature_engineering output
            analysis:          The saved analysis record (for context)

        Returns:
            dict: {"alerts": [...], "new_snapshot": {...}, "checked_at": "..."}
        """
        new_snapshot = self.generate_snapshot(competitors, features)

        if old_snapshot_json:
            try:
                old_snapshot = json.loads(old_snapshot_json)
            except Exception:
                old_snapshot = new_snapshot  # No diff possible
        else:
            old_snapshot = new_snapshot  # First snapshot

        alerts = self.generate_alerts(old_snapshot, new_snapshot, analysis)

        return {
            "alerts":       alerts,
            "new_snapshot": new_snapshot,
            "checked_at":   new_snapshot["timestamp"],
            "delta": {
                "competitors": new_snapshot["competitor_count"] - old_snapshot.get("competitor_count", 0),
                "avg_rating":  round(new_snapshot["avg_rating"] - old_snapshot.get("avg_rating", 0), 2),
                "reviews":     new_snapshot["total_reviews"] - old_snapshot.get("total_reviews", 0),
            }
        }
