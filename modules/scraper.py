import requests
from bs4 import BeautifulSoup
import re
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
import os
import pandas as pd
from apify_client import ApifyClient
from googleapiclient.discovery import build
from dotenv import load_dotenv
import logging

load_dotenv()

# Configure module-level logger
logger = logging.getLogger(__name__)

class CompetitorScraper:
    """
    Real-world Web Scraper.
    Given a list of Google Maps competitor names and coordinates, 
    this module searches Google to find their direct website, 
    phone numbers, and social media links.
    """
    def __init__(self):
        # We use a standard User-Agent so Google doesn't instantly block us
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
        }
        self.apify_token = os.getenv("APIFY_TOKEN")
        self.youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        self.apify_client = ApifyClient(self.apify_token) if self.apify_token and self.apify_token != "YOUR_APIFY_TOKEN" else None

    def scrape_competitors(self, competitors_data, location="India"):
        """
        Takes the mapped competitors list and adds contact & social intel.
        """
        # Limit to top 3 to keep analysis fast and avoid IP bans
        top_competitors = competitors_data[:3]
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            scraped_results = list(executor.map(
                lambda comp: self._scrape_single_competitor(comp, location),
                top_competitors
            ))
            
        # Merge back
        for i, res in enumerate(scraped_results):
            if i < len(competitors_data):
                competitors_data[i]['scraped_intel'] = res
                
        return competitors_data

    def _scrape_single_competitor(self, comp, location):
        """Scrape a single competitor via Google Search caching"""
        name = comp.get('name', '')
        if not name:
            return {"website": None, "phone": None, "socials": []}
            
        search_query = f"{name} {location} contact number website instagram facebook"
        url = f"https://www.google.com/search?q={urllib.parse.quote(search_query)}"
        
        intel = {
            "website": None,
            "phone": None,
            "socials": []
        }
        
        try:
            response = requests.get(url, headers=self.headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                text = soup.get_text(separator=' ', strip=True)
                
                # 1. Extract raw phone numbers from search results (Indian format)
                phone_matches = re.findall(r'(?:\+91[\-\s]?)?[0-9]{4,5}[\-\s]?[0-9]{5,6}', text)
                if phone_matches:
                    valid_phones = [p.strip() for p in phone_matches if len(re.sub(r'\D', '', p)) >= 10]
                    if valid_phones:
                        intel['phone'] = valid_phones[0]
                
                # 2. Extract social links and website from actual hrefs
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if 'google.com' in href or 'google.co.in' in href:
                        continue
                        
                    url_clean = href
                    if href.startswith('/url?q='):
                        url_clean = urllib.parse.unquote(href.split('/url?q=')[1].split('&sa=')[0])
                        
                    if 'instagram.com/' in url_clean and 'instagram' not in str(intel['socials']):
                        intel['socials'].append({'platform': 'Instagram', 'url': url_clean})
                    elif 'facebook.com/' in url_clean and 'facebook' not in str(intel['socials']):
                        intel['socials'].append({'platform': 'Facebook', 'url': url_clean})
                    elif 'zomato.com/' in url_clean and 'zomato' not in str(intel['socials']):
                        intel['socials'].append({'platform': 'Zomato', 'url': url_clean})
                    elif 'swiggy.com/' in url_clean and 'swiggy' not in str(intel['socials']):
                        intel['socials'].append({'platform': 'Swiggy', 'url': url_clean})
                    elif not intel['website'] and 'http' in url_clean and not any(x in url_clean for x in ['youtube', 'justdial', 'twitter', 'linkedin']):
                        if name.lower().replace(' ','')[:5] in url_clean.lower():
                             intel['website'] = url_clean

            return intel
        except Exception as e:
            logger.error(f"[Scraper] Failed for {name}: {str(e)}")
            return intel

    def scrape_influencers(self, business_type, location):
        """
        Scrape top influencers:
        - Uses Google Search for handles
        - Uses Apify for Instagram data
        - Uses YouTube Data API for YouTube data
        """
        # 1. Find potential handles via Web Search
        search_query = f"top {business_type} influencers in {location} instagram youtube"
        url = f"https://www.google.com/search?q={urllib.parse.quote(search_query)}"
        
        insta_handles = []
        youtube_channels = []
        
        try:
            response = requests.get(url, headers=self.headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    url_clean = href
                    if href.startswith('/url?q='):
                        url_clean = urllib.parse.unquote(href.split('/url?q=')[1].split('&sa=')[0])
                    
                    if 'instagram.com/' in url_clean and '/p/' not in url_clean and 'google' not in url_clean:
                        handle = url_clean.rstrip('/').split('/')[-1]
                        if handle and handle not in insta_handles and len(handle) < 35:
                            insta_handles.append(handle)
                    
                    if 'youtube.com/@' in url_clean or 'youtube.com/c/' in url_clean or 'youtube.com/user/' in url_clean:
                        channel = url_clean.rstrip('/').split('/')[-1]
                        if channel and channel not in youtube_channels:
                            youtube_channels.append(channel)

        except Exception as e:
            logger.error(f"[Scraper] Web searching influencers failed: {str(e)}")

        # Limit to requested 2 each
        insta_handles = insta_handles[:2]
        youtube_channels = youtube_channels[:2]

        all_influencers = []

        # 2. Scrape Instagram with Apify
        if self.apify_client and insta_handles:
            try:
                insta_data = self._run_apify_instagram(insta_handles)
                all_influencers.extend(insta_data)
            except Exception as e:
                logger.error(f"[Scraper] Apify Instagram failed: {str(e)}")
        
        # Fallback if Apify not available or fails
        if not any(i['platform'] == 'Instagram' for i in all_influencers):
            for handle in insta_handles:
                all_influencers.append({
                    "platform": "Instagram",
                    "handle": f"@{handle}",
                    "url": f"https://instagram.com/{handle}",
                    "stats": "Login to view",
                    "contact": "DM via Bio"
                })

        # 3. Scrape YouTube with Google API
        if self.youtube_api_key and self.youtube_api_key != "YOUR_YOUTUBE_API_KEY" and youtube_channels:
            try:
                youtube_data = self._run_youtube_api(youtube_channels)
                all_influencers.extend(youtube_data)
            except Exception as e:
                logger.error(f"[Scraper] YouTube API failed: {str(e)}")

        # Fallback if YouTube API not available
        if not any(i['platform'] == 'YouTube' for i in all_influencers):
            for channel in youtube_channels:
                all_influencers.append({
                    "platform": "YouTube",
                    "handle": channel.replace('@', ''),
                    "url": f"https://youtube.com/{channel}",
                    "stats": "API Key Required",
                    "contact": "YouTube Bio"
                })

        return all_influencers[:4] # 2 Insta + 2 YouTube

    def _run_apify_instagram(self, usernames):
        """Apify Instagram Scraper Integration"""
        run_input = {
            "usernames": usernames,
            "resultsLimit": 1
        }
        run = self.apify_client.actor("apify/instagram-profile-scraper").call(run_input=run_input)
        
        results = []
        for item in self.apify_client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append({
                "platform": "Instagram",
                "handle": f"@{item.get('username')}",
                "url": f"https://instagram.com/{item.get('username')}",
                "stats": f"{item.get('followersCount', 0):,} Followers",
                "bio": item.get("biography", "")[:50] + "...",
                "contact": "DM via Bio"
            })
        return results

    def _run_youtube_api(self, channels):
        """Google YouTube Data API Integration"""
        youtube = build("youtube", "v3", developerKey=self.youtube_api_key)
        
        results = []
        for channel_handle in channels:
            # First find channel ID if given handle
            search = youtube.search().list(q=channel_handle, type="channel", part="id,snippet", maxResults=1).execute()
            if not search.get('items'): continue
            
            channel_id = search['items'][0]['id']['channelId']
            details = youtube.channels().list(id=channel_id, part="statistics,snippet").execute()
            
            if details.get('items'):
                item = details['items'][0]
                results.append({
                    "platform": "YouTube",
                    "handle": item['snippet']['title'],
                    "url": f"https://youtube.com/channel/{channel_id}",
                    "stats": f"{item['statistics'].get('subscriberCount', 0):,} Subscribers",
                    "contact": "Channel About Section"
                })
        return results
