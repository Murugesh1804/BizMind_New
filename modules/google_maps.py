"""
SerpAPI Integration Module (Replaces Google Maps API)

This module uses SerpAPI to fetch competitor data from Google Maps.
SerpAPI provides a simpler interface and better reliability.
"""

import requests
import os


class GoogleMapsClient:
    """
    Client for SerpAPI Google Maps integration
    """
    
    def __init__(self, api_key=None):
        """
        Initialize the SerpAPI client
        
        Args:
            api_key (str): SerpAPI API key (falls back to SERPAPI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('SERPAPI_API_KEY')
        self.base_url = "https://serpapi.com/search"
        
    def fetch_competitors(self, business_type, location, radius=5000, max_results=20):
        """
        Fetch nearby competitors using SerpAPI
        
        Args:
            business_type (str): Type of business (e.g., "restaurant", "cafe")
            location (str): Location string (e.g., "Mumbai, India")
            radius (int): Search radius in meters (not used by SerpAPI, kept for compatibility)
            max_results (int): Maximum number of results to return
            
        Returns:
            list: List of competitor dictionaries with details
        """
        try:
            print(f"[SerpAPI] Searching for {business_type} in {location}")
            
            # Step 1: Search for places using SerpAPI
            search_query = f"{business_type} in {location}"
            places = self._search_places(search_query, max_results)
            
            if not places:
                print("[SerpAPI] No places found")
                return []
            
            print(f"[SerpAPI] Found {len(places)} places")
            
            # Step 2: Process and format competitor data
            competitors = []
            for place in places:
                competitor = {
                    'name': place.get('title', 'Unknown'),
                    'rating': float(place.get('rating', 0)),
                    'reviews_count': int(place.get('reviews', 0)),
                    'address': place.get('address', ''),
                    'reviews': self._extract_reviews(place),
                    'price_level': self._parse_price_level(place.get('price', '')),
                    'types': self._parse_types(place.get('type', []))
                }
                competitors.append(competitor)
            
            print(f"[SerpAPI] Successfully fetched {len(competitors)} competitors")
            return competitors
            
        except Exception as e:
            print(f"[SerpAPI ERROR] {str(e)}")
            return []
    
    def _search_places(self, query, max_results):
        """
        Search for places using SerpAPI Google Maps API
        
        Args:
            query (str): Search query
            max_results (int): Maximum results to return
            
        Returns:
            list: List of place results
        """
        try:
            params = {
                'engine': 'google_maps',
                'q': query,
                'type': 'search',
                'api_key': self.api_key,
                'num': min(max_results, 20)  # SerpAPI max is 20
            }
            
            print(f"[SerpAPI] Making API request for: {query}")
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Check for errors
            if 'error' in data:
                print(f"[SerpAPI] API Error: {data['error']}")
                return []
            
            # Extract local results
            local_results = data.get('local_results', [])
            
            if not local_results:
                print("[SerpAPI] No local results found")
                # Try to get place results as fallback
                place_results = data.get('place_results', [])
                print(f"[SerpAPI DEBUG] place_results type: {type(place_results)}")
                # If place_results is a dict (single result), wrap it in a list
                if isinstance(place_results, dict):
                    local_results = [place_results]
                    print("[SerpAPI DEBUG] Wrapped dict in list")
                elif isinstance(place_results, list):
                    local_results = place_results
                    print(f"[SerpAPI DEBUG] Using list with {len(place_results)} items")
                else:
                    local_results = []
                    print("[SerpAPI DEBUG] No valid place_results found")
            
            print(f"[SerpAPI DEBUG] Returning {len(local_results)} results (type: {type(local_results)})")
            return local_results[:max_results]
            
        except requests.exceptions.RequestException as e:
            print(f"[SerpAPI] Request error: {str(e)}")
            return []
        except Exception as e:
            print(f"[SerpAPI] Unexpected error: {str(e)}")
            return []
    
    def _extract_reviews(self, place):
        """
        Extract review texts from place data
        
        Args:
            place (dict): Place data from SerpAPI
            
        Returns:
            list: List of review text strings
        """
        reviews = []
        
        # SerpAPI provides reviews in different formats
        if 'reviews' in place and isinstance(place['reviews'], list):
            for review in place['reviews']:
                if isinstance(review, dict) and 'snippet' in review:
                    reviews.append(review['snippet'])
                elif isinstance(review, str):
                    reviews.append(review)
        
        # If no detailed reviews, create a summary from rating
        if not reviews and place.get('rating'):
            rating = place.get('rating', 0)
            review_count = place.get('reviews', 0)
            reviews.append(f"Rated {rating}/5 based on {review_count} reviews")
        
        return reviews
    
    def _parse_price_level(self, price_str):
        """
        Parse price level from string (e.g., "$$" -> 2)
        
        Args:
            price_str (str): Price string from SerpAPI
            
        Returns:
            int: Price level (0-4)
        """
        if not price_str:
            return 0
        
        # Count dollar signs or rupee symbols
        if '$' in price_str:
            return min(price_str.count('$'), 4)
        elif '₹' in price_str:
            return min(price_str.count('₹'), 4)
        
        return 0
    
    def _parse_types(self, type_data):
        """
        Parse type/category data from SerpAPI response
        
        Args:
            type_data: Can be a string, list, or None
            
        Returns:
            list: List of type strings
        """
        if isinstance(type_data, list):
            return type_data
        elif isinstance(type_data, str):
            return type_data.split(', ') if type_data else []
        else:
            return []
