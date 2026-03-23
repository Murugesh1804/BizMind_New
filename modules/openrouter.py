"""
Groq LLM Integration Module with RAG Support

This module handles AI insight generation using Groq API with RAG capabilities.
Groq provides fast, high-quality AI responses for business insights.
RAG integration allows the AI to supplement analysis with domain knowledge.
"""

from groq import Groq
import os
import re
import logging
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from sentence_transformers import SentenceTransformer
from langchain_core.embeddings import Embeddings

# Configure module-level logger
logger = logging.getLogger(__name__)

# Global model singleton
_model = None

def get_model():
    """
    Get or create the global embedding model instance.
    Includes CPU and memory optimizations.
    """
    global _model
    if _model is None:
        import torch
        # Use Torch CPU optimizations
        torch.set_num_threads(1)
        torch.set_num_interop_threads(1)
        # Disable gradients & training features
        torch.set_grad_enabled(False)
        
        logger.info("[Model] Loading embedding model...")
        _model = SentenceTransformer(
            "paraphrase-MiniLM-L3-v2",  # Ultra-small model
            device="cpu"
        )
    return _model

# Pre-load model at module level for production readiness
# This avoids lazy-loading latency on the first request
get_model()

class LazyHuggingFaceEmbeddings(Embeddings):
    """
    Custom Embeddings wrapper that uses the global lazy-loaded model.
    Compatible with LangChain and FAISS.
    """
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        model = get_model()
        embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, text: str) -> list[float]:
        model = get_model()
        embedding = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return embedding.tolist()


class OpenRouterClient:
    """
    Groq LLM Client (named OpenRouterClient for backward compatibility).
    Handles AI insight generation and chatbot responses with optional RAG support.
    """
    
    def __init__(self, api_key, enable_rag=True, vectordb_path="vectordb"):
        """
        Initialize Groq client with optional RAG support
        
        Args:
            api_key (str): Groq API key
            enable_rag (bool): Whether to enable RAG capabilities
            vectordb_path (str): Path to FAISS vector database
        """
        self.client = Groq(api_key=api_key)
        self.model = "groq/compound"  # Groq's compound model
        self.enable_rag = enable_rag
        self.vectordb_path = vectordb_path
        self.vectorstore = None
        
        # Lazy loading: vectorstore is NOT initialized here anymore
        # It will be initialized on first use in _ensure_vectorstore_loaded()
    
    def _ensure_vectorstore_loaded(self):
        """
        Lazy load the vector database if enabled and not yet loaded.
        Uses the optimized LazyHuggingFaceEmbeddings wrapper.
        """
        if self.enable_rag and self.vectorstore is None:
            try:
                logger.info("[RAG] Initializing vector database (Lazy Load)...")
                
                embeddings = LazyHuggingFaceEmbeddings()
                
                self.vectorstore = FAISS.load_local(
                    self.vectordb_path, 
                    embeddings, 
                    allow_dangerous_deserialization=True
                )
                logger.info("[RAG] Vector database loaded successfully")
            except Exception as e:
                logger.warning(f"[RAG] Could not load vector database: {str(e)}")
                logger.warning("[RAG] Continuing without RAG support")
                self.enable_rag = False
    
    def _retrieve_rag_context(self, business_type, location, features):
        """
        Retrieve relevant context from RAG vector database
        
        Args:
            business_type (str): Type of business
            location (str): Location
            features (dict): Calculated features
            
        Returns:
            str: Retrieved context from knowledge base
        """
        self._ensure_vectorstore_loaded()
        
        if not self.enable_rag or not self.vectorstore:
            return ""
        
        try:
            query = f"""
            Business type: {business_type}
            Location: {location}
            Competition level: {features.get('competition_level', 'Unknown')}
            Demand level: {features.get('demand_level', 'Unknown')}
            Success score: {features.get('success_score', 0)}/10
            
            What are the key considerations, risks, and strategies for this type of business in India?
            """
            
            docs = self.vectorstore.similarity_search(query, k=3)
            
            if docs:
                context = "\n\n".join([doc.page_content for doc in docs])
                logger.info(f"[RAG] Retrieved {len(docs)} relevant documents from knowledge base")
                return context
            else:
                return ""
                
        except Exception as e:
            logger.error(f"[RAG] Failed to retrieve context: {str(e)}")
            return ""
    
    def generate_insights(self, business_name, business_type, location, owner_type, 
                         features, compressed_reviews, competitors, budget=None, customer_base=None):
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
            budget (float): Provided budget in INR
            customer_base (dict): Customer base indicators
            
        Returns:
            dict: AI-generated insights
        """
        try:
            rag_context = ""
            if self.enable_rag:
                logger.info("[RAG] Retrieving relevant knowledge from database...")
                rag_context = self._retrieve_rag_context(business_type, location, features)
            
            prompt = self._build_prompt(
                business_name, business_type, location, owner_type,
                features, compressed_reviews, competitors, rag_context, budget, customer_base
            )
            
            response = self._call_api(prompt)
            
            insights = self._parse_response(response)
            
            logger.info("[Groq] Insights generated successfully")
            
            return insights
            
        except Exception as e:
            logger.error(f"[Groq] Insight generation failed: {str(e)}")
            return self._get_fallback_insights()
    
    def _build_prompt(self, business_name, business_type, location, owner_type,
                     features, compressed_reviews, competitors, rag_context="", budget=None, customer_base=None):
        """
        Build structured prompt for LLM with optional RAG context
        Truncates content to prevent 413 Payload Too Large errors
        """
        rag_section = ""
        if rag_context:
            rag_section = f"""
SUPPLEMENTAL KNOWLEDGE BASE (Use only when provided data is incomplete)
{rag_context[:500]}

NOTE: The above is general domain knowledge. Use it ONLY to support reasoning when 
the provided data below is insufficient. Always prioritize the actual data.
"""
        # Truncate compressed reviews aggressively to save tokens
        reviews_snippet = compressed_reviews[:500] if compressed_reviews else "No review data available"
        
        # Format competitors - only include name, rating, review count (exclude full review arrays)
        competitors_formatted = self._format_competitors(competitors[:3])  # Reduced from 5 to 3
        
        prompt = f"""You are a top-tier Indian retail market strategist with 20+ years of experience
in MSME success, street-level retail economics, and consumer behavior across various Indian city tiers.

CRITICAL GUIDELINES:
- All strategies, pricing, and insights MUST be hyper-localized to the Indian market and strictly adjusted based on the City Tier (Tier 1 Metro vs Tier 2 vs Tier 3).
- Always output values in Indian Rupees (₹) reflecting realistic local purchasing power.
- Make the insights exceptionally valuable, adaptive, and practical for this specific project. Avoid generic corporate jargon.
- Use the provided context as the PRIMARY source of truth.
- You MAY use your general knowledge to support reasoning ONLY when the context is incomplete.
- Do NOT invent Indian statistics, policies, or market facts.

IMPORTANT RULES:
- Base conclusions ONLY on the provided data and realistic Indian market behavior for the respective city tier.
- Do NOT assume Western pricing, demand, or customer psychology.
- If data is insufficient, state the uncertainty clearly.
- Think step-by-step internally, but output only the final structured insights.
- Prioritize practical, low-budget, high-ROI strategies suitable for Indian SMEs.

{rag_section}

BUSINESS CONTEXT (PRIMARY DATA - HIGHEST PRIORITY)
Name: {business_name}
Type: {business_type}
Location: {location}
Owner Type: {owner_type.capitalize()} entrepreneur
Capital Budget: ₹{f"{budget:,.0f}" if budget else "Unknown"}

MARKET METRICS
- Competitor Count: {features['competitor_count']}
- Average Rating: {features['avg_rating']}/5
- Total Reviews: {features['total_reviews']}
- Competition Level: {features['competition_level']}
- Demand Level: {features['demand_level']}
- Success Score: {features['success_score']}/10

CUSTOMER BASE INDICATORS
- Residential Density: {customer_base.get('apartments_count', 0) if customer_base else 0} apartments
- Education Centers: {customer_base.get('education_count', 0) if customer_base else 0} schools/universities
- Office Spaces: {customer_base.get('offices_count', 0) if customer_base else 0} commercial buildings
- Transit Access: {customer_base.get('transit_count', 0) if customer_base else 0} stations/stops
- Customer Score: {customer_base.get('customer_score', 0) if customer_base else 0}/100

CUSTOMER BASE CONTEXT:
- High apartment density = strong residential customer base
- Education centers = student demographics (price-sensitive, high volume)
- Office spaces = working professionals (higher spending power)
- Transit access = better footfall and accessibility

CUSTOMER REVIEW SIGNALS
{reviews_snippet}

TOP LOCAL COMPETITORS
{competitors_formatted}

ANALYSIS FRAMEWORK (Indian MSME Logic)

While reasoning, consider:
- Footfall economics vs rent sensitivity
- Price elasticity of middle-income Indian consumers
- Local competition clustering
- Trust factors: hygiene, consistency, friendliness, speed
- Fast payback period (<6 months preferred for SMEs)

OUTPUT FORMAT — FOLLOW STRICTLY

### Customer Sentiment Insights
Provide 2-4 bullets covering:
- Core customer expectations
- Pain points or dissatisfaction
- Emotional sentiment pattern

### Market Opportunity Analysis
Provide 2-4 bullets covering:
- Real demand strength in this locality
- Underserved niches or gaps
- Feasibility for a new entrant

### Pricing Strategy
Provide 2-4 bullets covering:
- Realistic Indian price band in ₹
- Positioning (budget / mid / premium)
- Tactical pricing move to win customers

### Customer Base Analysis
Provide 2-4 bullets covering:
- Primary customer segments in this area (residential/students/professionals)
- Expected footfall patterns and peak hours
- Demographic advantages for this specific business type
- Accessibility and convenience factors

### Risk Factors
Provide 2-4 bullets covering:
- Operational or financial risks
- Competition pressure
- Probability of failure (Low / Medium / High)

### Strategic Recommendations
Provide 3-5 highly practical actions:
- Differentiation strategy suited for this exact location
- First 30-day execution plan
- One quick-win tactic to generate daily cash flow

### Nearby Opportunities
Provide 2-3 bullets covering:
- Underserved niches or gaps in this local area (based on competitors)
- Complementary businesses that are missing

### MSME & Government Schemes
Provide 2-3 bullets covering:
- Recommended Indian MSME schemes (e.g. Mudra, Startup India, State subsidies) applicable to this owner type and business sector.

STYLE RULES
- Use concise bullet points only.
- No generic advice.
- No long paragraphs.
- Focus on actionable Indian ground reality.
"""

        # Log prompt size for debugging
        prompt_size = len(prompt)
        logger.info(f"[Groq] Prompt size: {prompt_size} characters")
        
        # Hard limit to prevent 413 errors (Groq limit ~6000 tokens ~24000 chars)
        if prompt_size > 20000:
            logger.warning(f"[Groq] Prompt too large ({prompt_size}), truncating...")
            prompt = prompt[:20000] + "\n\n[Content truncated due to size limits]\n"
        
        return prompt
    
    def _format_competitors(self, competitors):
        """Format competitor list for prompt - limited fields to save tokens"""
        lines = []
        for i, comp in enumerate(competitors, 1):
            # Only use basic fields, exclude reviews array to save tokens
            name = comp.get('name', 'Unknown')
            rating = comp.get('rating', 0)
            review_count = comp.get('reviews_count', 0)
            lines.append(f"{i}. {name} - Rating: {rating}/5 ({review_count} reviews)")
        return "\n".join(lines)
    
    def _call_api(self, prompt):
        """
        Call Groq API
        
        Args:
            prompt (str): Prompt to send
            
        Returns:
            str: API response text
        """
        logger.info("[Groq] Generating AI insights...")
        
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
        # Only log the full response at DEBUG level (not shown in production)
        logger.debug(f"[Groq] Full LLM Response:\n{'='*80}\n{response_text}\n{'='*80}")
        
        insights = {
            'sentiment': self._extract_section_improved(response_text, "Customer Sentiment"),
            'opportunity': self._extract_section_improved(response_text, "Market Opportunity"),
            'pricing': self._extract_section_improved(response_text, "Pricing Strategy"),
            'customer_base': self._extract_section_improved(response_text, "Customer Base Analysis"),
            'risks': self._extract_section_improved(response_text, "Risk Factors"),
            'recommendations': self._extract_section_improved(response_text, "Strategic Recommendations"),
            'market_gaps': self._extract_section_improved(response_text, "Nearby Opportunities"),
            'msme_schemes': self._extract_section_improved(response_text, "MSME & Government Schemes"),
            'full_analysis': response_text
        }
        
        # Log section summaries at debug level only
        for key, value in insights.items():
            if key != 'full_analysis':
                logger.debug(f"[Groq] Extracted [{key}]: {value[:200] if len(value) > 200 else value}")
        
        return insights
    
    def _extract_section_improved(self, text, section_name):
        """
        Improved section extraction with better pattern matching
        
        Args:
            text (str): Full response text
            section_name (str): Section to extract
            
        Returns:
            str: Extracted section content
        """
        patterns = {
            "Customer Sentiment": [
                r'###\s*\d+\.\s*Customer Sentiment',
                r'###\s*Customer Sentiment',
                r'\*\*\d+\.\s*Customer Sentiment',
                r'\*\*Customer Sentiment',
                r'^\d+\.\s*Customer Sentiment',
                r'^Customer Sentiment'
            ],
            "Market Opportunity": [
                r'###\s*\d+\.\s*Market Opportunity',
                r'###\s*Market Opportunity',
                r'\*\*\d+\.\s*Market Opportunity',
                r'\*\*Market Opportunity',
                r'^\d+\.\s*Market Opportunity',
                r'^Market Opportunity'
            ],
            "Pricing Strategy": [
                r'###\s*\d+\.\s*Pricing',
                r'###\s*Pricing Strategy',
                r'\*\*\d+\.\s*Pricing',
                r'\*\*Pricing Strategy',
                r'^\d+\.\s*Pricing',
                r'^Pricing Strategy'
            ],
            "Customer Base Analysis": [
                r'###\s*\d+\.\s*Customer Base',
                r'###\s*Customer Base',
                r'\*\*\d+\.\s*Customer Base',
                r'\*\*Customer Base',
                r'^\d+\.\s*Customer Base',
                r'^Customer Base Analysis'
            ],
            "Risk Factors": [
                r'###\s*\d+\.\s*Risk Factors',
                r'###\s*Risk Factors',
                r'###\s*\d+\.\s*Risks',
                r'###\s*Risks',
                r'\*\*\d+\.\s*Risk Factors',
                r'\*\*Risk Factors',
                r'\*\*\d+\.\s*Risks',
                r'\*\*Risks',
                r'^\d+\.\s*Risk Factors',
                r'^Risk Factors',
                r'^\d+\.\s*Risks',
                r'^Risks'
            ],
            "Strategic Recommendations": [
                r'###\s*\d+\.\s*Strategic',
                r'###\s*Strategic Recommendations',
                r'\*\*\d+\.\s*Strategic',
                r'\*\*Strategic Recommendations',
                r'^\d+\.\s*Strategic',
                r'^Strategic Recommendations'
            ],
            "Nearby Opportunities": [
                r'###\s*\d+\.\s*Nearby Opportunities',
                r'###\s*Nearby Opportunities',
                r'\*\*\d+\.\s*Nearby Opportunities',
                r'\*\*Nearby Opportunities',
                r'^\d+\.\s*Nearby Opportunities',
                r'^Nearby Opportunities'
            ],
            "MSME & Government Schemes": [
                r'###\s*\d+\.\s*MSME',
                r'###\s*MSME',
                r'\*\*\d+\.\s*MSME',
                r'\*\*MSME',
                r'^\d+\.\s*MSME',
                r'^MSME & Government Schemes'
            ]
        }
        
        section_patterns = patterns.get(section_name, [])
        if not section_patterns:
            return "No data available"
        
        lines = text.split('\n')
        
        start_idx = None
        for i, line in enumerate(lines):
            stripped = line.strip()
            for pattern in section_patterns:
                if re.search(pattern, stripped, re.IGNORECASE | re.MULTILINE):
                    start_idx = i + 1
                    break
            if start_idx is not None:
                break
        
        if start_idx is None:
            return "No data available"
        
        end_idx = len(lines)
        all_patterns = []
        for plist in patterns.values():
            all_patterns.extend(plist)
        
        for i in range(start_idx, len(lines)):
            stripped = lines[i].strip()
            if not stripped:
                continue
                
            for pattern in all_patterns:
                if re.search(pattern, stripped, re.IGNORECASE | re.MULTILINE):
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
        
        section_lines = []
        for i in range(start_idx, end_idx):
            line = lines[i].strip()
            
            if not line:
                continue
            
            if line in ['**', '###', '---', '***']:
                continue
            
            cleaned_line = line
            
            if re.match(r'^[\*\-•]\s+', cleaned_line):
                cleaned_line = re.sub(r'^[\*\-•]\s+', '- ', cleaned_line)
            
            section_lines.append(cleaned_line)
        
        result = '\n'.join(section_lines)
        
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
            'market_gaps': "- Market gap data unavailable",
            'msme_schemes': "- Cannot retrieve government schemes at the moment",
            'full_analysis': "AI analysis temporarily unavailable. Please check your API configuration."
        }

    # ─── Feature 4: AI Launch Strategy (30-day plan) ─────────────────────────

    def generate_launch_strategy(self, business_name, business_type, location,
                                  owner_type, features, customer_persona,
                                  cost_breakdown, revenue_simulation, budget=None):
        """
        Generate a step-by-step 30-day launch strategy.

        Returns:
            dict: {week1, week2, week3, week4, hiring_plan, menu_pricing_tips}
        """
        try:
            persona_summary = customer_persona.get("summary", "Mixed customer base") if customer_persona else "Mixed customer base"
            monthly_budget  = cost_breakdown.get("monthly_costs", {}).get("marketing", 5000) if cost_breakdown else 5000
            tier            = revenue_simulation.get("tier", "Tier-2") if revenue_simulation else "Tier-2"

            prompt = f"""You are an elite Indian startup launch consultant specializing in retail and MSME success across different city tiers.

BUSINESS CONTEXT
- Business: {business_name} ({business_type})
- Location: {location}
- City Tier: {tier}
- Owner Type: {owner_type.capitalize()} entrepreneur
- Target Customer: {persona_summary}
- Available Capital Budget: ₹{f"{budget:,.0f}" if budget else "Unknown"}
- Monthly Marketing Budget: ₹{monthly_budget:,}
- Competition Level: {features.get('competition_level', 'Moderate')}
- Demand Level: {features.get('demand_level', 'Moderate')}

Create a highly valuable and adaptable 30-day launch strategy. Be hyper-specific for India based strictly on the {tier} city context, local purchasing power, and local customer behavior. No generic advice.

OUTPUT FORMAT (follow exactly):

### Week 1: Setup & Branding
- (3-4 specific actions)

### Week 2: Soft Launch
- (3-4 specific actions)

### Week 3: Marketing Push
- (3-4 specific actions with platform/channel names)

### Week 4: Loyalty & Retention
- (3-4 specific actions)

### Action Items
- (Provide 5-7 clear, isolated checklist items for pre-launch setup. One sentence per bullet.)

### Hiring Plan
- (2-3 bullets: roles needed, when to hire, salary range in ₹)

### Quick Wins (First 7 Days)
- (2-3 immediate cash-flow tactics)

{'### Menu & Pricing Tips' if any(x in business_type.lower() for x in ["food","cafe","restaurant","bakery"]) else ''}
{'- (2-3 specific menu/pricing tactics)' if any(x in business_type.lower() for x in ["food","cafe","restaurant","bakery"]) else ''}

Keep all advice India-specific, ground-level, low-budget, and high-ROI."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1200
            )
            raw = response.choices[0].message.content

            def extract(text, header):
                import re
                pattern = rf'###\s*{re.escape(header)}.*?\n(.*?)(?=###|\Z)'
                match   = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
                return match.group(1).strip() if match else ""

            return {
                "week1":          extract(raw, "Week 1"),
                "week2":          extract(raw, "Week 2"),
                "week3":          extract(raw, "Week 3"),
                "week4":          extract(raw, "Week 4"),
                "hiring_plan":    extract(raw, "Hiring Plan"),
                "quick_wins":     extract(raw, "Quick Wins"),
                "action_items":   extract(raw, "Action Items"),
                "menu_tips":      extract(raw, "Menu"),
                "full_strategy":  raw
            }
        except Exception as e:
            logger.error(f"[Groq] Launch strategy generation failed: {str(e)}")
            return {
                "week1": "- Setup signage and branding\n- Register on Google Business Profile",
                "week2": "- Soft launch with 10-20% opening discount\n- Invite friends/family for first reviews",
                "week3": "- Instagram/Facebook ads targeting 5km radius\n- Distribute flyers near offices/colleges",
                "week4": "- Launch loyalty punch card\n- Run weekend special offer",
                "hiring_plan": "- Start with 2-3 flexible staff\n- Hire full-time after Month 2",
                "quick_wins":  "- WhatsApp broadcast to contacts\n- Register on Zomato/Swiggy/Google Maps",
                "action_items": "- Secure lease agreement\n- Obtain local trade licenses\n- Setup Google Business Profile\n- Finalize branding\n- Hire first 2 employees",
                "menu_tips": "",
                "full_strategy": "Strategy temporarily unavailable."
            }

    # ─── Feature 9: Marketing Intelligence ───────────────────────────────────

    def generate_marketing_plan(self, business_type, location, customer_persona,
                                 features, cost_breakdown, budget=None):
        """
        Generate channel-specific marketing intelligence.

        Returns:
            dict: {best_channels, ad_spend_estimate, cac_estimate, tips, full_plan}
        """
        try:
            persona_summary = customer_persona.get("summary", "") if customer_persona else ""
            primary_segment = customer_persona.get("primary_segment", "General Public") if customer_persona else "General Public"
            marketing_budget = cost_breakdown.get("monthly_costs", {}).get("marketing", 5000) if cost_breakdown else 5000

            prompt = f"""You are an expert Indian digital marketing strategist for small businesses, highly aware of regional and tier-based nuances.

BUSINESS: {business_type} in {location}
TARGET: {primary_segment} — {persona_summary}
TOTAL CAPITAL BUDGET: ₹{f"{budget:,.0f}" if budget else "Unknown"}
MONTHLY MARKETING BUDGET: ₹{marketing_budget:,}
COMPETITION: {features.get('competition_level', 'Moderate')}
DEMAND: {features.get('demand_level', 'Moderate')}

Generate a highly valuable, adaptable, and tier-specific Indian marketing intelligence report. All strategies, costs, and influencer expectations should realistically reflect the '{location}' market dynamics. Ensure markdown is clean.

OUTPUT FORMAT (follow exactly):

### Best Marketing Channels
| Channel | Effort | Budget Share | Expected Reach |
|---------|--------|--------------|----------------|
(Add 3-5 rows with specific Indian platforms: Instagram, Google My Business, WhatsApp, Zomato, etc.)

### Ad Spend Breakdown (Monthly ₹{marketing_budget:,})
- (Channel: ₹amount — purpose)
- (3-4 lines)

### Customer Acquisition Cost (CAC)
- Estimated CAC: ₹X–₹Y per customer
- Payback period: X weeks (based on avg transaction)

### Local Community Tactics
- (2-3 hyper-local tactics: RWA groups, local influencers, WhatsApp groups, etc.)

### Content Strategy
- (2-3 specific post ideas suited for the target customer segment)

Keep everything specific to Indian SME reality and the given budget."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=900
            )
            raw = response.choices[0].message.content

            def extract(text, header):
                import re
                pattern = rf'###\s*{re.escape(header)}.*?\n(.*?)(?=###|\Z)'
                match   = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
                return match.group(1).strip() if match else ""

            return {
                "channels_table":  extract(raw, "Best Marketing Channels"),
                "ad_spend":        extract(raw, "Ad Spend"),
                "cac_estimate":    extract(raw, "Customer Acquisition Cost"),
                "community_tactics": extract(raw, "Local Community"),
                "content_strategy":  extract(raw, "Content Strategy"),
                "full_plan":       raw
            }
        except Exception as e:
            logger.error(f"[Groq] Marketing plan generation failed: {str(e)}")
            return {
                "channels_table":    "| Channel | Effort | Budget Share |\n| Instagram | Medium | 40% | 5km radius |\n| Google My Business | Low | Free | Local SEO |",
                "ad_spend":          "- Instagram ads: ₹2,000/month\n- Google Ads: ₹1,500/month",
                "cac_estimate":      "- Estimated CAC: ₹80–₹150 per customer",
                "community_tactics": "- Join local RWA WhatsApp groups\n- Partner with nearby offices for lunch deals",
                "content_strategy":  "- Post daily specials on Instagram Stories\n- Share 'behind the scenes' Reels",
                "full_plan":         "Marketing plan temporarily unavailable."
            }

    # ─── Phase 1: Quick Preview Analysis ─────────────────────────────────────

    def quick_preview_insight(self, business_type, location, features, customer_base):
        """
        Generate a concise 2-3 bullet AI opinion for Phase 1 (before locking).

        Returns:
            str: 2-3 bullet opinion string
        """
        try:
            prompt = f"""You are a seasoned Indian retail market analyst.
Give a quick 2-3 bullet HONEST opinion on this location for this business.
Be direct, India-specific. No fluff.

Business: {business_type}
Location: {location}
Competitors nearby: {features.get('competitor_count', 0)} ({features.get('competition_level', 'Unknown')} competition)
Avg competitor rating: {features.get('avg_rating', 0)}/5
Demand level: {features.get('demand_level', 'Unknown')}
Customer score: {customer_base.get('customer_score', 0)}/100
Success score: {features.get('success_score', 0)}/10

Output ONLY 2-3 bullet points starting with - (one positive, one cautionary, one verdict).
Example format:
- ✅ Strong footfall from 8 nearby offices signals high lunchtime demand.
- ⚠️ 12 competitors within 1km — differentiation is critical to survive.
- 🎯 Viable location IF you focus on quick-service with unique pricing."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.6,
                max_tokens=200
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"[Groq] Quick preview failed: {str(e)}")
            score = features.get('success_score', 5)
            if score >= 7:
                return "- ✅ Strong demand signals in this area.\n- ⚠️ Competition present — differentiation needed.\n- 🎯 Good location with proper strategy."
            elif score >= 4:
                return "- ✅ Moderate opportunity detected.\n- ⚠️ Market saturated in some segments.\n- 🎯 Careful positioning needed to succeed."
            else:
                return "- ⚠️ High competition, low demand signals.\n- ❌ Risk is significant at this location.\n- 🎯 Consider exploring nearby alternatives."

    
    def chat(self, message, context=None):
        """
        Handle chatbot conversations with RAG support
        
        Args:
            message (str): User's message
            context (str): Optional context about current analysis or user
            
        Returns:
            str: Chatbot response
        """
        try:
            rag_context = ""
            
            self._ensure_vectorstore_loaded()
            
            if self.enable_rag and self.vectorstore:
                try:
                    docs = self.vectorstore.similarity_search(message, k=2)
                    if docs:
                        rag_context = "\n\n".join([doc.page_content for doc in docs])
                        logger.debug(f"[RAG Chat] Retrieved {len(docs)} relevant documents")
                except Exception as e:
                    logger.warning(f"[RAG Chat] Retrieval failed: {str(e)}")
            
            rag_section = ""
            if rag_context:
                rag_section = f"""

SUPPLEMENTAL KNOWLEDGE (Use only when needed):
{rag_context[:800]}

IMPORTANT: Use the above knowledge ONLY to support your response when the user's context 
is insufficient. Always prioritize the user's specific analysis data if provided.
If you use this supplemental knowledge, mention: "Based on general business knowledge..."
"""
            
            system_prompt = f"""You are **bBot**, the AI assistant for **BizMind – an AI Business Location Decision Support System for India**.

PRIMARY ROLE
- Help users understand their **business analysis results**
- Explain **metrics, scores, and insights** in simple terms
- Answer questions about **location, competition, demand, and pricing**
- Provide **practical Indian small-business guidance**
- Guide users in using **BizMind features effectively**

CRITICAL GUIDELINES:
- Use the provided context as the PRIMARY source of truth.
- You MAY use general knowledge to support reasoning ONLY when the context is incomplete.
- If you use knowledge outside the context, clearly say: "This part is based on general business knowledge, not the provided sources."
- Do NOT invent Indian statistics, policies, or market facts.
- If the question cannot be answered from context or safe general knowledge, reply: "I don't have enough reliable data to answer this."

RESPONSE STYLE
- Be **concise, friendly, and professional**
- Default response length: **under 120 words**
- Expand only if the user explicitly asks for detail
- Focus on **clear, actionable insights**, not theory
- Avoid generic Western business advice — prioritize **Indian MSME reality**

ACCURACY RULES
- Base explanations only on **BizMind data and realistic Indian market logic**
- If data is missing or uncertain, **state it clearly**
- Do **not fabricate numbers, competitors, or market facts**
- Do **not give legal, financial investment, or medical advice**

FORMATTING GUIDELINES
- Use **bold** for key terms, metrics, and numbers  
- Use bullet lists (- item) for grouped insights  
- Use numbered lists (1. item) for steps or processes  
- Use tables (| col1 | col2 |) for comparisons  
- Use `inline code` for technical metrics or feature names  
- Use short headings when helpful  

BIZMIND FEATURES CONTEXT
- **Location Analysis** → Uses map data to evaluate suitability  
- **Competitor Analysis** → Nearby competitor density & ratings  
- **Success Score (0–10)** → Overall feasibility indicator  
- **AI Insights** → Strategic recommendations  
- **Review Analysis** → Customer sentiment patterns  
- **Market Metrics** → Competition, demand, and pricing signals  

{rag_section}

GOAL
Help the user make **clear, confident business location decisions in India**.
"""

            if context:
                system_prompt += f"\n\nCurrent User Context:\n{context}"

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"[Groq Chat] Failed: {str(e)}")
            return "I'm having trouble connecting right now. Please try again in a moment."

    def copilot_chat(self, message, analysis_data, recent_metrics):
        """
        Handle COO Copilot interactions referencing live business metrics.
        """
        try:
            metrics_text = "No recent daily metrics logged."
            if recent_metrics:
                mt = []
                for m in recent_metrics[:7]: # Last 7 days
                    mt.append(f"Date: {m['date']}, Revenue: ₹{m['daily_revenue']}, Expenses: ₹{m['daily_expenses']}, Customers: {m['customer_count']}, Notes: {m.get('notes','')}")
                metrics_text = "\n".join(mt)

            system_prompt = f"""You are the AI Chief Operating Officer (COO) for **{analysis_data['business_name']}** ({analysis_data['business_type']}) located in **{analysis_data['location']}**.

PRIMARY ROLE:
- You are an active business partner helping the user run their day-to-day operations.
- You have access to their original launch strategy and their **Latest Daily Metrics**.
- Analyze their question in the context of their real data. Provide highly actionable, metric-driven advice suitable for an Indian MSME.
- Be concise (under 150 words), encouraging, but direct about financial realities.

LATEST DAILY METRICS (Past 7 Days):
{metrics_text}

BUSINESS CONTEXT (From Original Analysis):
- Success Score: {analysis_data['success_score']}/10
- Target Launch Date: {analysis_data.get('target_launch_date', 'Unknown')}

Your goal is to help them increase revenue, cut costs, or improve customer satisfaction based on the data above.
"""
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=400
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"[Groq Copilot Chat] Failed: {str(e)}")
            return "I'm having trouble analyzing your metrics right now. Please try again in a moment."

    def quick_preview_insight(self, business_type, location, features, customer_base):
        """
        Generate a very quick 2-3 bullet point initial insight for the Quick Preview (Phase 1).
        """
        try:
            self._ensure_vectorstore_loaded()
            comp_level = features.get('competition_level', 'Unknown')
            demand_level = features.get('demand_level', 'Unknown')
            success_score = features.get('success_score', 0)
            
            prompt = f"""
            You are an expert AI business location analyst.
            I am considering opening a {business_type} in {location}.
            
            Quick Stats:
            - Competition Level: {comp_level}
            - Demand Level: {demand_level}
            - Success Score: {success_score}/100
            
            Provide exactly 2 or 3 short, punchy bullet points of immediate advice or initial warnings based solely on these stats. Keep it very concise (max 2 sentences per bullet). No fluff.
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=200
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"[Groq Preview] error: {str(e)}")
            return f"- AI Analysis temporarily unavailable\n- {str(e)}"

