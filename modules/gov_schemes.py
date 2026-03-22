
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
        Get a list of applicable government schemes by scraping live data.
        """
        schemes = []
        
        # 1. Base default fallback schemes (always highly relevant for Indian MSMEs)
        schemes.append({
            'name': 'Mudra Loan (PMMY)',
            'description': 'Collateral-free loans up to ₹10 lakh for non-corporate, non-farm small/micro enterprises. Ideal for quick startup capital.',
            'url': 'https://www.mudra.org.in/'
        })

        if 'food' in business_type.lower() or 'restaurant' in business_type.lower() or 'cafe' in business_type.lower():
            schemes.append({
                'name': 'PMFME Scheme',
                'description': 'Up to ₹10 lakh subsidy for micro food processing enterprises. Covers restaurants and packaged food startups.',
                'url': 'https://pmfme.mofpi.gov.in/'
            })

        # 2. Live Scraper for State/Sector specific schemes
        search_query = f"{business_type} startup MSME subsidy scheme in {location} site:gov.in"
        url = f"https://www.google.com/search?q={urllib.parse.quote(search_query)}"
        
        try:
            response = requests.get(url, headers=self.headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find organic search result links
                for g in soup.find_all('div', class_='g')[:3]:  # Top 3 results
                    a_tag = g.find('a', href=True)
                    if a_tag:
                        href = a_tag['href']
                        if href.startswith('/url?q='):
                            href = urllib.parse.unquote(href.split('/url?q=')[1].split('&sa=')[0])
                            
                        # Only accept gov sites
                        if '.gov.in' in href or '.nic.in' in href:
                            title_tag = g.find('h3')
                            if title_tag:
                                title = title_tag.get_text()
                                # Prevent duplicates
                                if title not in [s['name'] for s in schemes]:
                                    schemes.append({
                                        'name': title.strip(),
                                        'description': f"State/Central scheme applicable for {business_type} in {location}.",
                                        'url': href
                                    })
        except Exception as e:
            print(f"[GovSchemes] Scraping failed: {str(e)}")

        return schemes[:4] # Return top 4 distinct schemes
