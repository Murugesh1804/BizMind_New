"""
Groq LLM Integration Module

This module handles AI insight generation using Groq API.
Groq provides fast, high-quality AI responses for business insights.
"""

from groq import Groq
import os
import re


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
            
            # Call Groq API
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

**Task:** Provide a structured analysis with the following sections. Use EXACTLY these headers:

### Customer Sentiment Insights
- What do customers value most?
- Common complaints or gaps in service?
- Key sentiment patterns

### Market Opportunity Analysis
- Is there demand for this business type?
- What opportunities exist?
- Market gaps to exploit

### Pricing Strategy
- Suggested price range
- Positioning (budget/mid-range/premium)
- Competitive pricing insights

### Risk Factors
- Key challenges
- Competition concerns
- Market saturation risks

### Strategic Recommendations
- Specific actionable advice
- Differentiation strategies
- Implementation priorities
- Quick wins

Keep each section concise (2-4 bullet points). Use bullet points with clear, actionable insights."""

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
            max_tokens=1500
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
        print("\n[DEBUG] Full LLM Response:")
        print("=" * 80)
        print(response_text)
        print("=" * 80)
        
        # Extract sections using improved method
        insights = {
            'sentiment': self._extract_section_improved(response_text, "Customer Sentiment"),
            'opportunity': self._extract_section_improved(response_text, "Market Opportunity"),
            'pricing': self._extract_section_improved(response_text, "Pricing Strategy"),
            'risks': self._extract_section_improved(response_text, "Risk Factors"),
            'recommendations': self._extract_section_improved(response_text, "Strategic Recommendations"),
            'full_analysis': response_text
        }
        
        # Debug: Print extracted sections
        print("\n[DEBUG] Extracted Sections:")
        for key, value in insights.items():
            if key != 'full_analysis':
                print(f"\n{key.upper()}:")
                print(value[:300] if len(value) > 300 else value)
        
        return insights
    
    def _extract_section_improved(self, text, section_name):
        """
        Improved section extraction with better pattern matching
        
        Args:
            text (str): Full response text
            section_name (str): Section to extract
            
        Returns:
            str: Extracted section content with proper formatting
        """
        # Define header patterns for each section
        patterns = {
            "Customer Sentiment": [
                r'###\s*Customer Sentiment',
                r'\*\*Customer Sentiment',
                r'^\*?\*?1[\.\)]\s*\*?\*?.*Customer Sentiment',
                r'^Customer Sentiment'
            ],
            "Market Opportunity": [
                r'###\s*Market Opportunity',
                r'\*\*Market Opportunity',
                r'^\*?\*?2[\.\)]\s*\*?\*?.*Market Opportunity',
                r'^Market Opportunity'
            ],
            "Pricing Strategy": [
                r'###\s*Pricing Strategy',
                r'\*\*Pricing Strategy',
                r'^\*?\*?3[\.\)]\s*\*?\*?.*Pricing',
                r'^Pricing Strategy'
            ],
            "Risk Factors": [
                r'###\s*Risk',
                r'\*\*Risk',
                r'^\*?\*?4[\.\)]\s*\*?\*?.*Risk',
                r'^Risk Factors'
            ],
            "Strategic Recommendations": [
                r'###\s*Strategic Recommendations',
                r'\*\*Strategic Recommendations',
                r'^\*?\*?5[\.\)]\s*\*?\*?.*Strategic',
                r'^Strategic Recommendations'
            ]
        }
        
        section_patterns = patterns.get(section_name, [])
        if not section_patterns:
            return "No data available"
        
        lines = text.split('\n')
        
        # Find the start of this section
        start_idx = None
        for i, line in enumerate(lines):
            stripped = line.strip()
            for pattern in section_patterns:
                if re.search(pattern, stripped, re.IGNORECASE | re.MULTILINE):
                    start_idx = i + 1  # Start from next line
                    break
            if start_idx is not None:
                break
        
        if start_idx is None:
            return "No data available"
        
        # Find the end of this section (next section header or end of text)
        end_idx = len(lines)
        all_patterns = []
        for plist in patterns.values():
            all_patterns.extend(plist)
        
        for i in range(start_idx, len(lines)):
            stripped = lines[i].strip()
            if not stripped:
                continue
                
            # Check if this is a new section header
            for pattern in all_patterns:
                if re.search(pattern, stripped, re.IGNORECASE | re.MULTILINE):
                    # Make sure it's not the same section
                    is_same = False
                    for our_pattern in section_patterns:
                        if re.search(our_pattern, stripped, re.IGNORECASE | re.MULTILINE):
                            is_same = True
                            break
                    
                    if not is_same:
                        end_idx = i
                        break
            
            if end_idx < len(lines):
                break
        
        # Extract and clean the content
        section_lines = []
        for i in range(start_idx, end_idx):
            line = lines[i].strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Skip lines that are just markdown or formatting
            if line in ['**', '###', '---', '***']:
                continue
            
            # Clean up the line
            # Remove leading asterisks from bullet points but keep the dash/bullet
            cleaned_line = line
            
            # Normalize bullet points to use dash
            if re.match(r'^[\*\-•]\s+', cleaned_line):
                cleaned_line = re.sub(r'^[\*\-•]\s+', '- ', cleaned_line)
            
            section_lines.append(cleaned_line)
        
        result = '\n'.join(section_lines)
        
        # If no content found, return default message
        if not result.strip():
            return "No data available"
        
        return result
    
    def _get_fallback_insights(self):
        """
        Return fallback insights if API fails
        
        Returns:
            dict: Basic fallback insights
        """
        return {
            'sentiment': "- Customer data analysis unavailable\n- Please check API configuration",
            'opportunity': "- Market analysis unavailable\n- Manual research recommended",
            'pricing': "- Research local market rates for pricing guidance",
            'risks': "- API connection failed\n- Manual analysis required",
            'recommendations': "- Verify API keys\n- Check internet connection\n- Retry analysis",
            'full_analysis': "AI analysis temporarily unavailable. Please check your API configuration."
        }