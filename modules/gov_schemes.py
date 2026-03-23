
"""
Indian Government Schemes Module
"""

class GovSchemes:
    """
    Identifies relevant Indian government schemes for a business.
    """

import urllib.parse
import requests
from bs4 import BeautifulSoup
import re
import logging

# Configure module-level logger
logger = logging.getLogger(__name__)

class GovSchemes:
    """
    Identifies relevant Indian government schemes for a business by scraping .gov.in resources.
    """

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }

    def get_schemes(self, business_type, location):
        """
        Fetch relevant schemes by searching official portals and matching content.
        """
        schemes = []
        try:
            # Step 1: Search relevant keywords on MyScheme / MSME portals
            query = f"{business_type} business schemes india msme"
            search_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}+site:.gov.in"
            
            response = requests.get(search_url, headers=self.headers, timeout=8)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Simplified parsing of search results
            for result in soup.find_all('div', class_='g'):
                title_tag = result.find('h3')
                link_tag = result.find('a')
                snippet_tag = result.find('div', class_='VwiC3b')
                
                if title_tag and link_tag:
                    title = title_tag.get_text()
                    link = link_tag.get('href')
                    description = snippet_tag.get_text() if snippet_tag else "Government initiative for small businesses."
                    
                    # Basic filtering for actual schemes
                    if any(kw in title.lower() or kw in description.lower() for kw in ["scheme", "loan", "subsidy", "grant", "yojana"]):
                        schemes.append({
                            "name": title.replace(" - MyScheme", "").replace(" | MSME", ""),
                            "description": description[:200] + "...",
                            "url": link
                        })
            
            # Step 2: Add high-probability static fallbacks if needed
            if len(schemes) < 2:
                schemes.append({
                    "name": "Pradhan Mantri Mudra Yojana (PMMY)",
                    "description": "Collateral-free loans up to ₹10 Lakh for small business units.",
                    "url": "https://www.mudra.org.in/"
                })
                schemes.append({
                    "name": "Credit Guarantee Fund Trust (CGTMSE)",
                    "description": "Collateral-free credit facility to the new and existing micro and small enterprises.",
                    "url": "https://www.cgtmse.in/"
                })
        except Exception as e:
            logger.error(f"[GovSchemes] Scraping failed: {str(e)}")

        return schemes[:4] # Return top 4 distinct schemes
