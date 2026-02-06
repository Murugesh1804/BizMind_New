"""
Groq LLM Integration Module

This module handles AI insight generation using Groq API.
Groq provides fast, high-quality AI responses for business insights.
"""

from groq import Groq
import os


class OpenRouterClient:
    """
    Client for Groq API (renamed from OpenRouterClient for compatibility)
    """
    
    def __init__(self, api_key):
        """
        Initialize Groq client
        
        Args:
            api_key (str): Groq API key
        """
        self.client = Groq(api_key=api_key)
        self.model = "groq/compound"  # Groq's compound model
    
    def generate_insights(self, business_name, business_type, location, owner_type, 
                         features, compressed_reviews, competitors):
        """
        Generate AI-powered business insights
        
        Args:
            business_name (str): Name of the business
            business_type (str): Type of business
            location (str): Location
            owner_type (str): Owner type (new/existing)
            features (dict): Calculated features
            compressed_reviews (str): Compressed review text
            competitors (list): List of competitors
            
        Returns:
            dict: AI-generated insights
        """
        try:
            # Build structured prompt
            prompt = self._build_prompt(
                business_name, business_type, location, owner_type,
                features, compressed_reviews, competitors
            )
            
            # Call Groq API (print statement moved to _call_api)
            response = self._call_api(prompt)
            
            # Parse response
            insights = self._parse_response(response)
            
            print("[Groq] Insights generated successfully")
            
            return insights
            
        except Exception as e:
            print(f"[Groq ERROR] {str(e)}")
            return self._get_fallback_insights()
    
    def _build_prompt(self, business_name, business_type, location, owner_type,
                     features, compressed_reviews, competitors):
        """
        Build structured prompt for LLM
        
        Returns:
            str: Formatted prompt
        """
        prompt = f"""You are a business location analysis expert. Analyze the following data and provide actionable insights.

**Business Information:**
- Name: {business_name}
- Type: {business_type}
- Location: {location}
- Owner: {owner_type.capitalize()} business owner

**Market Metrics:**
- Competitor Count: {features['competitor_count']}
- Average Rating: {features['avg_rating']}/5.0
- Total Reviews: {features['total_reviews']}
- Competition Level: {features['competition_level']}
- Demand Level: {features['demand_level']}
- Success Score: {features['success_score']}/10

**Customer Reviews Summary:**
{compressed_reviews[:1000]}

**Top Competitors:**
{self._format_competitors(competitors[:5])}

**Task:** Provide a structured analysis with the following sections:

1. **Customer Sentiment Insights** (2-3 bullet points)
   - What do customers value most?
   - Common complaints or gaps in service?

2. **Market Opportunity Analysis** (2-3 bullet points)
   - Is there demand for this business type?
   - What opportunities exist?

3. **Pricing Strategy** (1-2 sentences)
   - Suggested price range
   - Positioning (budget/mid-range/premium)

4. **Risk Factors** (2-3 bullet points)
   - Key challenges
   - Competition concerns

5. **Strategic Recommendations** (3-4 bullet points)
   - Specific actionable advice
   - Differentiation strategies

Keep responses concise, professional, and actionable. Use bullet points."""

        return prompt
    
    def _format_competitors(self, competitors):
        """Format competitor list for prompt"""
        lines = []
        for i, comp in enumerate(competitors, 1):
            lines.append(f"{i}. {comp['name']} - Rating: {comp['rating']}/5 ({comp['reviews_count']} reviews)")
        return "\n".join(lines)
    
    def _call_api(self, prompt):
        """
        Call Groq API
        
        Args:
            prompt (str): Prompt to send
            
        Returns:
            str: API response text
        """
        print("[Groq] Generating AI insights...")
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    def _parse_response(self, response_text):
        """
        Parse LLM response into structured insights
        
        Args:
            response_text (str): Raw LLM response
            
        Returns:
            dict: Structured insights
        """
        # Simple parsing - extract sections
        insights = {
            'sentiment': self._extract_section(response_text, "Customer Sentiment"),
            'opportunity': self._extract_section(response_text, "Market Opportunity"),
            'pricing': self._extract_section(response_text, "Pricing Strategy"),
            'risks': self._extract_section(response_text, "Risk Factors"),
            'recommendations': self._extract_section(response_text, "Strategic Recommendations"),
            'full_analysis': response_text
        }
        
        return insights
    
    def _extract_section(self, text, section_name):
        """
        Extract a specific section from the response
        
        Args:
            text (str): Full response text
            section_name (str): Section to extract
            
        Returns:
            str: Extracted section content
        """
        # Find section by header
        lines = text.split('\n')
        section_lines = []
        in_section = False
        
        for line in lines:
            if section_name.lower() in line.lower():
                in_section = True
                continue
            
            if in_section:
                # Stop at next numbered section or empty line after content
                if line.strip() and (line.strip()[0].isdigit() and '. **' in line):
                    break
                if line.strip():
                    section_lines.append(line.strip())
        
        return '\n'.join(section_lines) if section_lines else "No data available"
    
    def _get_fallback_insights(self):
        """
        Return fallback insights if API fails
        
        Returns:
            dict: Basic fallback insights
        """
        return {
            'sentiment': "• Customer data analysis unavailable\n• Please check API configuration",
            'opportunity': "• Market analysis unavailable\n• Manual research recommended",
            'pricing': "Research local market rates for pricing guidance",
            'risks': "• API connection failed\n• Manual analysis required",
            'recommendations': "• Verify API keys\n• Check internet connection\n• Retry analysis",
            'full_analysis': "AI analysis temporarily unavailable. Please check your API configuration."
        }
