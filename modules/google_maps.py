"""
Google Maps API Integration Module

This module uses the official Google Maps API to fetch competitor data.
It provides geocoding, nearby search, and place details functionality.
"""

import googlemaps
from datetime import datetime
import math
import os
import logging

# Configure module-level logger
logger = logging.getLogger(__name__)

class GoogleMapsClient:
    """
    Client for interacting with Google Maps APIs (Places, Geocoding)
    """
    
    def __init__(self, api_key):
        """
        Initialize the Google Maps client
        """
        self.api_key = api_key
        self.client = None
        
        if api_key:
            try:
                self.client = googlemaps.Client(key=api_key)
                logger.info("[Google Maps] Client initialized successfully")
            except Exception as e:
                logger.error(f"[Google Maps] Initialization failed: {str(e)}")
        else:
            logger.warning("[Google Maps] API key not provided. Client will not be functional.")
    
    def geocode(self, location):
        """
        Convert location name to coordinates
        
        Args:
            location (str): Location name or address
            
        Returns:
            dict: Latitude and longitude
        """
        if not self.client:
            return None
            
        try:
            logger.info(f"[Google Maps] Geocoding location: {location}")
            geocode_result = self.client.geocode(location)
            
            if geocode_result:
                location_data = geocode_result[0]['geometry']['location']
                coords = {
                    'latitude': location_data['lat'],
                    'longitude': location_data['lng']
                }
                logger.info(f"[Google Maps] Found coordinates: {coords['latitude']}, {coords['longitude']}")
                return coords
            else:
                logger.warning(f"[Google Maps] No results found for: {location}")
                return None
                
        except Exception as e:
            logger.error(f"[Google Maps] Geocoding error: {str(e)}")
            return None
    
    def fetch_competitors(self, business_type, location, latitude=None, longitude=None, radius=1000, max_results=20):
        """
        Fetch nearby competitors from Google Places API
        
        Args:
            business_type (str): Type of business (e.g., 'cafe')
            location (str): Location name (fallback if coordinates not provided)
            latitude (float): Latitude
            longitude (float): Longitude
            radius (int): Search radius in meters
            max_results (int): Maximum number of results to fetch
            
        Returns:
            list: List of competitor dictionaries
        """
        if not self.client:
            return []
            
        try:
            # Get coordinates if not provided
            if latitude is None or longitude is None:
                logger.info(f"[Google Maps] No coordinates provided, geocoding: {location}")
                coords = self.geocode(location)
                if coords:
                    latitude = coords['latitude']
                    longitude = coords['longitude']
                else:
                    logger.error("[Google Maps] Failed to get coordinates")
                    return []
            
            logger.info(f"[Google Maps] Searching for {business_type} near ({latitude}, {longitude})")
            logger.info(f"[Google Maps] Radius: {radius}m, Max results: {max_results}")
            
            # Fetch nearby places
            places_result = self.client.places_nearby(
                location=(latitude, longitude),
                radius=radius,
                keyword=business_type,
                type=business_type.lower().replace(' ', '_')
            )
            
            places = places_result.get('results', [])
            
            if not places:
                logger.warning("[Google Maps] No places found")
                return []
                
            logger.info(f"[Google Maps] Found {len(places)} places")
            
            # Limit results
            places = places[:max_results]
            
            competitors = []
            
            # Fetch details for each place
            for place in places:
                try:
                    place_id = place['place_id']
                    
                    # Fetch detailed info (including reviews)
                    details = self.client.place(
                        place_id=place_id,
                        fields=['name', 'rating', 'user_ratings_total', 'formatted_address', 
                               'geometry', 'price_level', 'review', 'type', 'website', 
                               'formatted_phone_number', 'opening_hours']
                    ).get('result', {})
                    
                    # Calculate distance
                    dest_lat = details['geometry']['location']['lat']
                    dest_lng = details['geometry']['location']['lng']
                    distance = self._calculate_distance(latitude, longitude, dest_lat, dest_lng)
                    
                    competitor = {
                        'name': details.get('name', 'Unknown'),
                        'rating': details.get('rating', 0),
                        'reviews_count': details.get('user_ratings_total', 0),
                        'address': details.get('formatted_address', 'N/A'),
                        'latitude': dest_lat,
                        'longitude': dest_lng,
                        'distance': round(distance),
                        'price_level': details.get('price_level', 0),
                        'types': details.get('types', []),
                        'website': details.get('website', ''),
                        'phone': details.get('formatted_phone_number', ''),
                        'opening_hours': details.get('opening_hours', {}).get('weekday_text', []),
                        'reviews': [r.get('text', '') for r in details.get('reviews', [])]
                    }
                    
                    logger.info(f"[Google Maps] Fetching details for: {competitor['name']}")
                    competitors.append(competitor)
                    
                except Exception as e:
                    logger.error(f"[Google Maps] Error processing place: {str(e)}")
                    continue
            
            logger.info(f"[Google Maps] Successfully fetched {len(competitors)} competitors with details")
            return competitors
            
        except Exception as e:
            logger.error(f"[Google Maps] Error in fetch_competitors: {str(e)}")
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
