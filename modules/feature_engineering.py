"""
Feature Engineering Module

This module calculates business metrics and scores:
- Competitor density score
- Average rating score
- Demand indicator
- Opportunity score
- Final success score (0-10) - now with adaptive weighting!
"""

# ============================================================================
# ADAPTIVE WEIGHTS PER BUSINESS CATEGORY
# ============================================================================
# Defines how much each factor contributes to the success score based on the
# type of business. This makes the scoring more intelligent and contextual.
#
# Categories:
# - food: Restaurants, cafes, etc. Demand and ratings are critical.
# - retail: Shops, boutiques. Competition and opportunity matter more.
# - service: Salons, gyms, repairs. Quality (ratings) is key.
# - professional: Offices, clinics. Less sensitive to reviews, more to density.
#
# Weights are: [Competition, Rating, Demand, Opportunity]
# ============================================================================
ADAPTIVE_WEIGHTS = {
    "food":      [0.20, 0.30, 0.35, 0.15],
    "retail":    [0.30, 0.20, 0.25, 0.25],
    "service":   [0.25, 0.35, 0.25, 0.15],
    "health":    [0.25, 0.35, 0.25, 0.15],
    "education": [0.30, 0.25, 0.20, 0.25],
    "default":   [0.25, 0.25, 0.30, 0.20], # Original weights
}

BUSINESS_CATEGORIES = {
    # Food & Drink
    "restaurant": "food", "cafe": "food", "bar": "food", "bakery": "food",
    "food": "food", "meal_delivery": "food", "meal_takeaway": "food",
    # Retail
    "store": "retail", "clothing_store": "retail", "convenience_store": "retail",
    "supermarket": "retail", "grocery_or_supermarket": "retail", "furniture_store": "retail",
    "electronics_store": "retail", "hardware_store": "retail", "book_store": "retail",
    "liquor_store": "retail", "pet_store": "retail", "shoe_store": "retail",
    # Services
    "beauty_salon": "service", "hair_care": "service", "laundry": "service",
    "car_repair": "service", "gym": "service", "spa": "service", "travel_agency": "service",
    # Health
    "doctor": "health", "dentist": "health", "pharmacy": "health", "hospital": "health",
    "physiotherapist": "health", "veterinary_care": "health",
    # Education
    "school": "education", "university": "education", "primary_school": "education",
    "secondary_school": "education", "library": "education",
}


class FeatureEngineer:
    """
    Feature engineering for business location analysis
    """
    
    def get_weights(self, business_type: str) -> list[float]:
        """
        Get adaptive weights for a given business type.
        Falls back to default if type is unknown.
        """
        category = "default"
        for cat_keyword, cat_name in BUSINESS_CATEGORIES.items():
            if cat_keyword in business_type.lower():
                category = cat_name
                break
        print(f"[INFO] Using '{category}' weight profile for business type '{business_type}'")
        return ADAPTIVE_WEIGHTS[category]

    def calculate_features(self, competitors_data: list, business_type: str):
        """
        Calculate all features from competitor data
        
        Args:
            competitors_data (list): List of competitor dictionaries
            business_type (str): The type of business being analyzed
            
        Returns:
            dict: Calculated features and scores
        """
        # Basic metrics
        competitor_count = len(competitors_data)
        
        # Extract ratings and review counts
        ratings = [c['rating'] for c in competitors_data if c['rating'] > 0]
        review_counts = [c['reviews_count'] for c in competitors_data]
        
        # Calculate individual scores
        competition_score = self._calculate_competition_score(competitor_count)
        rating_score = self._calculate_rating_score(ratings)
        demand_score = self._calculate_demand_score(review_counts)
        opportunity_score = self._calculate_opportunity_score(
            competition_score, 
            rating_score, 
            demand_score
        )
        
        # Calculate final success score (0-10 scale)
        success_score = self._calculate_success_score(
            competition_score,
            rating_score,
            demand_score,
            opportunity_score,
            business_type # Pass business type for adaptive weights
        )
        
        # Determine recommendation
        recommendation = self._get_recommendation(success_score)
        
        # Prepare feature dictionary
        features = {
            'competitor_count': competitor_count,
            'avg_rating': round(sum(ratings) / len(ratings), 2) if ratings else 0,
            'total_reviews': sum(review_counts),
            'avg_reviews_per_competitor': round(sum(review_counts) / len(review_counts), 1) if review_counts else 0,
            'competition_score': round(competition_score, 2),
            'rating_score': round(rating_score, 2),
            'demand_score': round(demand_score, 2),
            'opportunity_score': round(opportunity_score, 2),
            'success_score': round(success_score, 1),
            'recommendation': recommendation,
            'competition_level': self._get_competition_level(competitor_count),
            'demand_level': self._get_demand_level(demand_score)
        }
        
        return features
    
    def _calculate_competition_score(self, competitor_count):
        """
        Calculate competition score (inverse of density)
        
        Formula: 1 - min(competitor_count / 30, 1.0)
        
        Args:
            competitor_count (int): Number of competitors
            
        Returns:
            float: Competition score (0-1)
        """
        # Lower competition = higher score
        # Normalize by 30 competitors (saturates at 30+)
        normalized = min(competitor_count / 30.0, 1.0)
        return 1.0 - normalized
    
    def _calculate_rating_score(self, ratings):
        """
        Calculate average rating score
        
        Formula: average_rating / 5.0
        
        Args:
            ratings (list): List of rating values
            
        Returns:
            float: Rating score (0-1)
        """
        if not ratings:
            return 0.5  # Neutral score if no data
        
        avg_rating = sum(ratings) / len(ratings)
        return avg_rating / 5.0
    
    def _calculate_demand_score(self, review_counts):
        """
        Calculate demand indicator based on review volume
        
        Formula: min(total_reviews / 1000, 1.0)
        
        Args:
            review_counts (list): List of review counts
            
        Returns:
            float: Demand score (0-1)
        """
        if not review_counts:
            return 0.0
        
        total_reviews = sum(review_counts)
        # Normalize by 1000 reviews (saturates at 1000+)
        return min(total_reviews / 1000.0, 1.0)
    
    def _calculate_opportunity_score(self, competition_score, rating_score, demand_score):
        """
        Calculate opportunity score based on market conditions
        
        High opportunity = Low competition + High demand + Room for improvement (lower ratings)
        
        Args:
            competition_score (float): Competition score
            rating_score (float): Rating score
            demand_score (float): Demand score
            
        Returns:
            float: Opportunity score (0-1)
        """
        # Inverse rating score (lower ratings = more opportunity)
        rating_gap = 1.0 - rating_score
        
        # Weighted combination
        opportunity = (
            0.4 * competition_score +  # Low competition is good
            0.4 * demand_score +        # High demand is good
            0.2 * rating_gap            # Room for improvement is good
        )
        
        return min(max(opportunity, 0.0), 1.0)
    
    def _calculate_success_score(self, competition_score, rating_score, demand_score, opportunity_score, business_type):
        """
        Calculate final success score (0-10 scale) using adaptive weights.
        
        Args:
            competition_score (float): Competition score
            rating_score (float): Rating score
            demand_score (float): Demand score
            opportunity_score (float): Opportunity score
            business_type (str): The type of business for adaptive weighting
            
        Returns:
            float: Success score (0-10)
        """
        # Get the adaptive weights for this business type
        weights = self.get_weights(business_type)
        
        weighted_score = (
            weights[0] * competition_score +
            weights[1] * rating_score +
            weights[2] * demand_score +
            weights[3] * opportunity_score
        )
        
        # Scale to 0-10
        return weighted_score * 10.0
    
    def _get_recommendation(self, success_score):
        """
        Get recommendation based on success score
        
        Args:
            success_score (float): Success score (0-10)
            
        Returns:
            str: Recommendation text
        """
        if success_score >= 7.0:
            return "Strongly Recommended"
        elif success_score >= 4.0:
            return "Moderate Potential"
        else:
            return "Not Recommended"
    
    def _get_competition_level(self, competitor_count):
        """
        Get competition level description
        
        Args:
            competitor_count (int): Number of competitors
            
        Returns:
            str: Competition level
        """
        if competitor_count < 5:
            return "Low"
        elif competitor_count < 15:
            return "Moderate"
        else:
            return "High"
    
    def _get_demand_level(self, demand_score):
        """
        Get demand level description
        
        Args:
            demand_score (float): Demand score (0-1)
            
        Returns:
            str: Demand level
        """
        if demand_score < 0.3:
            return "Low"
        elif demand_score < 0.7:
            return "Moderate"
        else:
            return "High"
