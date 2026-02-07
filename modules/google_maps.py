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
    
    def geocode(self, location):
        """
        Convert a location string to coordinates using SerpAPI
        
        Args:
            location (str): Location string (e.g., "Alandur, Chennai, India")
            
        Returns:
            dict: {'latitude': float, 'longitude': float} or None if failed
        """
        try:
            params = {
                'engine': 'google_maps',
                'q': location,
                'type': 'search',
                'api_key': self.api_key
            }
            
            print(f"[SerpAPI Geocoding] Looking up coordinates for: {location}")
            response = requests.get(self.base_url, params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            # Check for errors
            if 'error' in data:
                print(f"[SerpAPI Geocoding] Error: {data['error']}")
                return None
            
            # Try to get coordinates from search metadata
            if 'search_metadata' in data and 'google_maps_url' in data['search_metadata']:
                # Parse coordinates from the URL if available
                url = data['search_metadata']['google_maps_url']
                if '@' in url:
                    coords_part = url.split('@')[1].split(',')[:2]
                    try:
                        lat = float(coords_part[0])
                        lng = float(coords_part[1])
                        print(f"[SerpAPI Geocoding] Found coordinates: {lat}, {lng}")
                        return {'latitude': lat, 'longitude': lng}
                    except (IndexError, ValueError):
                        pass
            
            # Try to get from local_results
            if 'local_results' in data and len(data['local_results']) > 0:
                first_result = data['local_results'][0]
                if 'gps_coordinates' in first_result:
                    coords = first_result['gps_coordinates']
                    print(f"[SerpAPI Geocoding] Found coordinates: {coords['latitude']}, {coords['longitude']}")
                    return coords
            
            # Try place_results
            if 'place_results' in data:
                place = data['place_results']
                if isinstance(place, dict) and 'gps_coordinates' in place:
                    coords = place['gps_coordinates']
                    print(f"[SerpAPI Geocoding] Found coordinates: {coords['latitude']}, {coords['longitude']}")
                    return coords
            
            print(f"[SerpAPI Geocoding] No coordinates found for: {location}")
            return None
            
        except Exception as e:
            print(f"[SerpAPI Geocoding] Error: {str(e)}")
            return None
        
    def fetch_competitors(self, business_type, location, latitude=None, longitude=None, radius=500, max_results=20):
        """
        Fetch nearby competitors using SerpAPI with radius filtering
        
        Args:
            business_type (str): Type of business (e.g., "restaurant", "cafe")
            location (str): Location string (e.g., "Mumbai, India")
            latitude (float): Optional latitude for precise location
            longitude (float): Optional longitude for precise location
            radius (int): Search radius in meters (default: 500m = 0.5km)
            max_results (int): Maximum number of results to return
            
        Returns:
            list: List of competitor dictionaries with details
        """
        try:
            # Build search query - use coordinates if available for precision
            if latitude and longitude:
                # Use coordinates with SerpAPI's ll parameter for accurate location
                search_query = business_type
                ll_param = f"@{latitude},{longitude},15z"  # 15z is zoom level
                print(f"[SerpAPI] Searching for {business_type} near coordinates {latitude},{longitude}")
                print(f"[SerpAPI] Filtering within {radius}m radius")
            else:
                search_query = f"{business_type} in {location}"
                ll_param = None
                print(f"[SerpAPI] Searching for {business_type} in {location}")
            
            # Step 1: Search for places using SerpAPI
            places = self._search_places(search_query, max_results * 2, ll_param)  # Get more to filter by radius
            
            if not places:
                print("[SerpAPI] No places found")
                return []
            
            print(f"[SerpAPI] Found {len(places)} places")
            
            # Step 2: Process and format competitor data
            competitors = []
            competitors_filtered = 0
            
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
                
                # Add GPS coordinates if available
                has_coords = False
                if 'gps_coordinates' in place:
                    competitor['latitude'] = place['gps_coordinates'].get('latitude')
                    competitor['longitude'] = place['gps_coordinates'].get('longitude')
                    has_coords = True
                    
                    # Calculate distance if we have both center point and competitor coords
                    if latitude and longitude and competitor['latitude'] and competitor['longitude']:
                        # Debug: Log coordinates for first competitor
                        if len(competitors) == 0 and competitors_filtered == 0:
                            print(f"[SerpAPI DEBUG] Center: ({latitude}, {longitude})")
                            print(f"[SerpAPI DEBUG] Competitor '{competitor['name']}': ({competitor['latitude']}, {competitor['longitude']})")
                        
                        distance = self._calculate_distance(
                            latitude, longitude,
                            competitor['latitude'], competitor['longitude']
                        )
                        competitor['distance_meters'] = distance
                        
                        # Skip if outside radius (only filter if we have coordinates)
                        if distance > radius:
                            competitors_filtered += 1
                            # Debug: Log first few filtered competitors
                            if competitors_filtered <= 3:
                                print(f"[SerpAPI DEBUG] Filtered '{competitor['name']}' - {int(distance)}m away (radius: {radius}m)")
                            continue
                
                # Add competitor (either within radius or no coords to check)
                competitors.append(competitor)
                
                # Stop if we have enough results
                if len(competitors) >= max_results:
                    break
            
            if competitors_filtered > 0:
                print(f"[SerpAPI] Filtered out {competitors_filtered} competitors outside {radius}m radius")
            print(f"[SerpAPI] Successfully fetched {len(competitors)} competitors")
            return competitors
        
            
        except Exception as e:
            print(f"[SerpAPI ERROR] {str(e)}")
            return []
    
    def _search_places(self, query, max_results, ll_param=None):
        """
        Search for places using SerpAPI Google Maps API
        
        Args:
            query (str): Search query
            max_results (int): Maximum results to return
            ll_param (str): Optional location parameter (e.g., "@13.034,80.157,15z")
            
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
            
            # Add location parameter if provided
            if ll_param:
                params['ll'] = ll_param
            
            print(f"[SerpAPI] Making API request for: {query}" + (f" at {ll_param}" if ll_param else ""))
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
    
    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate distance between two points using Haversine formula
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
            
        Returns:
            float: Distance in meters
        """
        import math
        
        # Earth's radius in meters
        R = 6371000
        
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        return distance
