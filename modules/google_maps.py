"""
Google Maps API Integration Module

This module uses the official Google Maps API to fetch competitor data.
It provides geocoding, nearby search, and place details functionality.
"""

import googlemaps
import os
from datetime import datetime


class GoogleMapsClient:
    """
    Client for Google Maps API integration
    """
    
    def __init__(self, api_key=None):
        """
        Initialize the Google Maps client
        
        Args:
            api_key (str): Google Maps API key (falls back to GOOGLE_MAP_API env var)
        """
        self.api_key = api_key or os.getenv('GOOGLE_MAP_API')
        if not self.api_key:
            raise ValueError("Google Maps API key is required. Set GOOGLE_MAP_API environment variable.")
        
        self.client = googlemaps.Client(key=self.api_key)
        print("[Google Maps] Client initialized successfully")
    
    def geocode(self, location):
        """
        Convert a location string to coordinates using Google Geocoding API
        
        Args:
            location (str): Location string (e.g., "Alandur, Chennai, India")
            
        Returns:
            dict: {'latitude': float, 'longitude': float} or None if failed
        """
        try:
            print(f"[Google Maps] Geocoding location: {location}")
            
            # Call Google Geocoding API
            geocode_result = self.client.geocode(location)
            
            if not geocode_result:
                print(f"[Google Maps] No results found for: {location}")
                return None
            
            # Extract coordinates from first result
            location_data = geocode_result[0]['geometry']['location']
            coords = {
                'latitude': location_data['lat'],
                'longitude': location_data['lng']
            }
            
            print(f"[Google Maps] Found coordinates: {coords['latitude']}, {coords['longitude']}")
            return coords
            
        except Exception as e:
            print(f"[Google Maps] Geocoding error: {str(e)}")
            return None
    
    def fetch_competitors(self, business_type, location, latitude=None, longitude=None, radius=500, max_results=20):
        """
        Fetch nearby competitors using Google Places API with radius filtering
        
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
            # Ensure we have coordinates
            if not latitude or not longitude:
                print(f"[Google Maps] No coordinates provided, geocoding: {location}")
                coords = self.geocode(location)
                if coords:
                    latitude = coords['latitude']
                    longitude = coords['longitude']
                else:
                    print("[Google Maps] Failed to get coordinates")
                    return []
            
            print(f"[Google Maps] Searching for {business_type} near ({latitude}, {longitude})")
            print(f"[Google Maps] Radius: {radius}m, Max results: {max_results}")
            
            # Step 1: Nearby Search
            places = self._search_nearby_places(
                latitude=latitude,
                longitude=longitude,
                keyword=business_type,
                radius=radius
            )
            
            if not places:
                print("[Google Maps] No places found")
                return []
            
            print(f"[Google Maps] Found {len(places)} places")
            
            # Step 2: Get detailed information for each place
            competitors = []
            
            for idx, place in enumerate(places[:max_results]):
                try:
                    place_id = place.get('place_id')
                    if not place_id:
                        continue
                    
                    # Get basic info
                    competitor = {
                        'name': place.get('name', 'Unknown'),
                        'rating': float(place.get('rating', 0)),
                        'reviews_count': int(place.get('user_ratings_total', 0)),
                        'address': place.get('vicinity', ''),
                        'types': place.get('types', [])
                    }
                    
                    # Add coordinates
                    if 'geometry' in place and 'location' in place['geometry']:
                        loc = place['geometry']['location']
                        competitor['latitude'] = loc['lat']
                        competitor['longitude'] = loc['lng']
                        
                        # Calculate distance
                        distance = self._calculate_distance(
                            latitude, longitude,
                            loc['lat'], loc['lng']
                        )
                        competitor['distance_meters'] = distance
                    
                    # Parse price level
                    competitor['price_level'] = place.get('price_level', 0)
                    
                    # Fetch detailed place information including reviews
                    print(f"[Google Maps] Fetching details for: {competitor['name']}")
                    details = self._fetch_place_details(place_id)
                    
                    if details:
                        competitor['reviews'] = details.get('reviews', [])
                        competitor['phone'] = details.get('phone', '')
                        competitor['website'] = details.get('website', '')
                        competitor['hours'] = details.get('hours', {})
                    else:
                        competitor['reviews'] = []
                    
                    competitors.append(competitor)
                    
                except Exception as e:
                    print(f"[Google Maps] Error processing place: {str(e)}")
                    continue
            
            print(f"[Google Maps] Successfully fetched {len(competitors)} competitors with details")
            return competitors
            
        except Exception as e:
            print(f"[Google Maps] Error in fetch_competitors: {str(e)}")
            return []
    
    def _search_nearby_places(self, latitude, longitude, keyword, radius):
        """
        Search for nearby places using Google Places Nearby Search
        
        Args:
            latitude (float): Center latitude
            longitude (float): Center longitude
            keyword (str): Search keyword (business type)
            radius (int): Search radius in meters
            
        Returns:
            list: List of place results
        """
        try:
            # Call Places Nearby Search API
            places_result = self.client.places_nearby(
                location=(latitude, longitude),
                radius=radius,
                keyword=keyword,
                rank_by=None  # Use radius-based ranking
            )
            
            places = places_result.get('results', [])
            
            # Get additional pages if available (up to 60 total results)
            next_page_token = places_result.get('next_page_token')
            attempts = 0
            
            while next_page_token and len(places) < 60 and attempts < 2:
                import time
                time.sleep(2)  # Required delay for next_page_token to become valid
                
                try:
                    next_result = self.client.places_nearby(
                        page_token=next_page_token
                    )
                    places.extend(next_result.get('results', []))
                    next_page_token = next_result.get('next_page_token')
                    attempts += 1
                except Exception as e:
                    print(f"[Google Maps] Error fetching next page: {str(e)}")
                    break
            
            return places
            
        except Exception as e:
            print(f"[Google Maps] Nearby search error: {str(e)}")
            return []
    
    def _fetch_place_details(self, place_id):
        """
        Fetch detailed information for a specific place using Google Place Details API
        
        Args:
            place_id (str): Google Maps place ID
            
        Returns:
            dict: Detailed place information including reviews, or None if failed
        """
        try:
            # Request specific fields to optimize API usage
            fields = [
                'name', 'rating', 'reviews', 'formatted_phone_number',
                'website', 'opening_hours', 'price_level', 'user_ratings_total'
            ]
            
            place_result = self.client.place(
                place_id=place_id,
                fields=fields
            )
            
            if 'result' not in place_result:
                return None
            
            place = place_result['result']
            
            # Extract reviews
            reviews = []
            if 'reviews' in place:
                for review in place['reviews'][:50]:  # Limit to 50 reviews
                    review_text = review.get('text', '')
                    if review_text:
                        reviews.append(review_text)
            
            # Extract opening hours
            hours = {}
            if 'opening_hours' in place and 'weekday_text' in place['opening_hours']:
                hours = {
                    'weekday_text': place['opening_hours']['weekday_text'],
                    'open_now': place['opening_hours'].get('open_now', False)
                }
            
            detailed_data = {
                'reviews': reviews,
                'phone': place.get('formatted_phone_number', ''),
                'website': place.get('website', ''),
                'hours': hours
            }
            
            print(f"[Google Maps] Fetched {len(reviews)} reviews")
            return detailed_data
            
        except Exception as e:
            print(f"[Google Maps] Place details error: {str(e)}")
            return None
    
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
