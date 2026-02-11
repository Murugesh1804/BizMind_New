"""
Groq LLM Integration Module with RAG Support

This module handles AI insight generation using Groq API with RAG capabilities.
Groq provides fast, high-quality AI responses for business insights.
RAG integration allows the AI to supplement analysis with domain knowledge.
"""

from groq import Groq
import os
import re
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS


class OpenRouterClient:
    """
    Client for Groq API (renamed from OpenRouterClient for compatibility)
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
        self.vectorstore = None
        
        # Initialize RAG components if enabled
        if self.enable_rag:
            try:
                print("[RAG] Initializing vector database...")
                embeddings = HuggingFaceEmbeddings(
                    model_name="sentence-transformers/all-MiniLM-L6-v2"
                )
                self.vectorstore = FAISS.load_local(
                    vectordb_path, 
                    embeddings, 
                    allow_dangerous_deserialization=True
                )
                print("[RAG] Vector database loaded successfully")
            except Exception as e:
                print(f"[RAG WARNING] Could not load vector database: {str(e)}")
                print("[RAG] Continuing without RAG support")
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
        if not self.enable_rag or not self.vectorstore:
            return ""
        
        try:
            # Build query for RAG retrieval
            query = f"""
            Business type: {business_type}
            Location: {location}
            Competition level: {features.get('competition_level', 'Unknown')}
            Demand level: {features.get('demand_level', 'Unknown')}
            Success score: {features.get('success_score', 0)}/10
            
            What are the key considerations, risks, and strategies for this type of business in India?
            """
            
            # Retrieve relevant documents
            docs = self.vectorstore.similarity_search(query, k=3)
            
            if docs:
                context = "\n\n".join([doc.page_content for doc in docs])
                print(f"[RAG] Retrieved {len(docs)} relevant documents from knowledge base")
                return context
            else:
                return ""
                
        except Exception as e:
            print(f"[RAG ERROR] Failed to retrieve context: {str(e)}")
            return ""
    
    def generate_insights(self, business_name, business_type, location, owner_type, 
                         features, compressed_reviews, competitors, customer_base=None):
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
            # Retrieve relevant context from RAG if enabled
            rag_context = ""
            if self.enable_rag:
                print("[RAG] Retrieving relevant knowledge from database...")
                rag_context = self._retrieve_rag_context(business_type, location, features)
            
            # Build structured prompt
            prompt = self._build_prompt(
                business_name, business_type, location, owner_type,
                features, compressed_reviews, competitors, rag_context, customer_base
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
                     features, compressed_reviews, competitors, rag_context="", customer_base=None):
        """
        Build structured prompt for LLM with optional RAG context
        
        Args:
            rag_context (str): Additional context from RAG knowledge base
        
        Returns:
            str: Formatted prompt
        """
        # Build RAG context section if available
        rag_section = ""
        if rag_context:
            rag_section = f"""
SUPPLEMENTAL KNOWLEDGE BASE (Use only when provided data is incomplete)
{rag_context}

NOTE: The above is general domain knowledge. Use it ONLY to support reasoning when 
the provided data below is insufficient. Always prioritize the actual data.
"""
        
        prompt = f"""You are a senior Indian retail market strategist with 20+ years of experience
in MSME success, street-level retail economics, and consumer behavior in India.

CRITICAL GUIDELINES:
- Use the provided context as the PRIMARY source of truth.
- You MAY use your general knowledge to support reasoning ONLY when the context is incomplete.
- If you use knowledge outside the context, clearly say: "This part is based on general business knowledge, not the provided sources."
- Do NOT invent Indian statistics, policies, or market facts.
- If the question cannot be answered from context or safe general knowledge, reply: "I don't have enough reliable data to answer this."

IMPORTANT RULES:
- Base conclusions ONLY on the provided data and realistic Indian market behavior.
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
{compressed_reviews[:1000]}

TOP LOCAL COMPETITORS
{self._format_competitors(competitors[:5])}

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

STYLE RULES
- Use concise bullet points only.
- No generic advice.
- No long paragraphs.
- Focus on actionable Indian ground reality.
"""

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
            'customer_base': self._extract_section_improved(response_text, "Customer Base Analysis"),
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
        """
        # Define header patterns for each section
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
    
    def chat(self, message, context=None):
        """
        Handle chatbot conversations with RAG support
        
        Args:
            message (str): User's message
            context (dict): Optional context about current analysis or user
            
        Returns:
            str: Chatbot response
        """
        try:
            # Retrieve RAG context for the user's question if enabled
            rag_context = ""
            if self.enable_rag and self.vectorstore:
                try:
                    docs = self.vectorstore.similarity_search(message, k=2)
                    if docs:
                        rag_context = "\n\n".join([doc.page_content for doc in docs])
                        print(f"[RAG Chat] Retrieved {len(docs)} relevant documents")
                except Exception as e:
                    print(f"[RAG Chat ERROR] {str(e)}")
            
            # Build RAG section if available
            rag_section = ""
            if rag_context:
                rag_section = f"""

SUPPLEMENTAL KNOWLEDGE (Use only when needed):
{rag_context[:800]}

IMPORTANT: Use the above knowledge ONLY to support your response when the user's context 
is insufficient. Always prioritize the user's specific analysis data if provided.
If you use this supplemental knowledge, mention: "Based on general business knowledge..."
"""
            
            # Build system prompt for bBot
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

            # Add context if available
            if context:
                context_str = f"\n\nCurrent User Context:\n{context}"
                system_prompt += context_str

            # Call Groq API
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
            print(f"[Groq Chat ERROR] {str(e)}")
            return "I'm having trouble connecting right now. Please try again in a moment."
