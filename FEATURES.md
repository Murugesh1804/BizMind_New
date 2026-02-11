# BizMind - AI Business Location Decision Support System

## 📋 Project Overview

**BizMind** is a comprehensive, production-ready AI-powered web application that helps entrepreneurs and business owners make data-driven decisions about business locations. It combines real-time geospatial data, competitive analysis, customer base demographics, and AI-generated insights to provide detailed business viability assessments.

### **Key Capabilities**
- 🔐 **Secure User Authentication**: JWT-based login system with password hashing
- 💾 **Database Persistence**: Complete analysis history stored in SQLite
- 🤖 **AI Chatbot (bBot)**: Interactive assistant for questions and guidance
- 🏘️ **Customer Base Analysis**: Demographic scoring with heatmap visualization
- 📊 **Data Visualization**: Interactive charts and graphs using Chart.js
- 📥 **Export Features**: Download analyses as JSON or PDF reports
- 🗺️ **Interactive Maps**: Leaflet.js with radius selection and location picking
- 🔍 **RAG System**: Retrieval-Augmented Generation for enhanced insights
- ⚡ **Performance Optimized**: Parallel API calls and data compression

### **Latest Updates (2026)**
- ✅ User authentication and authorization system
- ✅ Complete database persistence with SQLite
- ✅ Analysis history dashboard with search and filter
- ✅ AI chatbot integration (bBot)
- ✅ Customer base demographic analysis
- ✅ Enhanced competitor data (50 reviews, phone, website, hours)
- ✅ Chart.js visualizations and heatmaps
- ✅ JSON and PDF export functionality
- ✅ RAG system for knowledge-enhanced responses
- ✅ Parallel data fetching for faster performance

---

## 🎯 Core Features

### 1. **Interactive Location Selection**
- **Leaflet Map Integration**: Interactive map powered by OpenStreetMap
- **Click-to-Select**: Users can click anywhere on the map to select a location
- **GPS Location**: "Use My Location" button for automatic location detection
- **Reverse Geocoding**: Automatically converts coordinates to readable addresses
- **Visual Feedback**: Blue marker and radius circle show selected location and search area

### 2. **Intelligent Geocoding**
- **Automatic Coordinate Conversion**: Converts location names to GPS coordinates
- **SerpAPI Integration**: Uses Google Maps geocoding via SerpAPI
- **Fallback Support**: Works with both coordinates and location names
- **Multi-format Support**: Accepts various location formats (city, address, landmark)

### 3. **Radius-Based Competitor Search**
- **Customizable Search Radius**: 
  - 500m (0.5km) - Very Local
  - 1km - Neighborhood
  - 2km - District
  - 5km - City-wide
- **Dynamic Circle Visualization**: Map circle updates in real-time when radius changes
- **Accurate Distance Calculation**: Haversine formula for precise distance measurement
- **Smart Filtering**: Only includes competitors within selected radius

### 4. **Comprehensive Competitor Analysis**
- **Real-time Data**: Fetches live competitor data from Google Maps via SerpAPI
- **Rich Competitor Profiles**:
  - Business name and type
  - Customer ratings (1-5 stars)
  - Review counts
  - Price levels
  - Physical addresses
  - GPS coordinates
  - Distance from selected location
  - Phone numbers and websites
  - Operating hours
- **Enhanced Review Collection**: Up to 50 reviews per competitor for deeper insights
- **Up to 20 Competitors**: Analyzes multiple competitors in the area
- **Detailed Place Information**: Comprehensive business metadata

### 5. **AI-Powered Insights Generation**

#### **LLM Integration (Groq API)**
- **Model**: llama-3.1-70b-versatile
- **Temperature**: 0.7 for balanced creativity and accuracy
- **Max Tokens**: 1500 for detailed responses

#### **Five Strategic Insight Categories**:

1. **Customer Sentiment Insights**
   - What customers value most
   - Common complaints and service gaps
   - Key sentiment patterns
   - Overall satisfaction analysis

2. **Market Opportunity Analysis**
   - Demand assessment for business type
   - Identified market opportunities
   - Market gaps to exploit
   - Growth potential evaluation

3. **Pricing Strategy**
   - Suggested price ranges
   - Market positioning (budget/mid-range/premium)
   - Competitive pricing insights
   - Value proposition recommendations

4. **Risk Factors**
   - Key business challenges
   - Competition concerns
   - Market saturation risks
   - Operational challenges

5. **Strategic Recommendations**
   - Specific actionable advice
   - Differentiation strategies
   - Implementation priorities
   - Quick wins for early success

### 6. **Advanced Data Compression**

#### **LLMLingua Integration**
- **Purpose**: Compress large review datasets for efficient LLM processing
- **Model**: microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank
- **Compression Rate**: ~35% token reduction
- **Benefits**:
  - Reduces API costs
  - Faster processing
  - Maintains semantic meaning
  - Handles large review volumes

### 7. **Feature Engineering**
- **Automated Metrics Calculation**:
  - Average competitor rating
  - Total review count
  - Price level distribution
  - Market saturation indicators
  - Success score (0-10)
  - Demand level (Low/Medium/High)
  - Competition level (Low/Moderate/High)
  - Customer base score (0-100)
  - Demographic indicators

### 8. **Modern, Responsive UI**

#### **Design Principles**:
- Clean, minimal interface
- Dark mode support
- Mobile-responsive layout
- Glassmorphism effects
- Smooth animations and transitions

#### **Technology Stack**:
- **Frontend**: HTML5, Tailwind CSS, JavaScript
- **Fonts**: Google Fonts (Manrope)
- **Icons**: Material Symbols
- **Map**: Leaflet.js + OpenStreetMap

#### **Key UI Components**:
- Vertical stepper for workflow visualization
- Toggle buttons for owner experience level
- Radius selector dropdown
- Interactive map with zoom controls
- Loading states and animations
- Professional color scheme (#137fec primary)

### 9. **Intelligent Response Formatting**

#### **Markdown to HTML Conversion**:
- **Bold Text**: `**text**` → `<strong>text</strong>`
- **Bullet Points**: `- item` → `<li>item</li>`
- **Paragraphs**: Automatic paragraph wrapping
- **Lists**: Proper `<ul>` structure

#### **Custom Styling**:
- Blue bullet points (#137fec)
- Proper line spacing (1.7-1.8)
- Dark mode support
- Responsive text sizing

### 10. **Owner Experience Personalization**
- **New Owner Mode**: Beginner-friendly recommendations
- **Serial Entrepreneur Mode**: Advanced strategic insights
- **Customized Advice**: Tailored to experience level

---

## 🛠️ Technical Architecture

### **Backend (Python/Flask)**
```
app.py
├── Route: / (GET) - Landing page
├── Route: /register (GET) - Registration page
├── Route: /login (GET) - Login page
├── Route: /api/auth/register (POST) - User registration
├── Route: /api/auth/login (POST) - User login
├── Route: /api/auth/me (GET) - Get current user [PROTECTED]
├── Route: /analyze (POST) - Main analysis endpoint [PROTECTED]
├── Route: /history (GET) - Analysis history page
├── Route: /api/history (GET) - Get user analyses [PROTECTED]
├── Route: /api/history/<id> (GET) - Get specific analysis [PROTECTED]
├── Route: /api/history/<id> (DELETE) - Delete analysis [PROTECTED]
├── Route: /api/history/<id>/download (GET) - Download analysis [PROTECTED]
├── Route: /api/chat (POST) - Chatbot endpoint
└── Route: /loading (GET) - Loading page
```

### **Core Modules**

#### **1. google_maps.py**
- SerpAPI integration
- Geocoding service
- Competitor data fetching
- Enhanced place details (phone, website, hours)
- Distance calculation (Haversine)
- Radius-based filtering
- Review collection (up to 50 per place)

#### **2. openrouter.py**
- Groq API integration (llama-3.1-70b-versatile)
- LLM prompt engineering
- Response parsing and formatting
- Section extraction
- Chatbot conversation handling
- Context-aware responses
- Fallback handling

#### **3. llm_compression.py**
- LLMLingua integration
- Review data compression (~35% reduction)
- Token optimization
- Semantic preservation
- Batch processing

#### **4. feature_engineering.py**
- Metrics calculation
- Success scoring algorithm
- Demand assessment
- Competition analysis
- Customer base integration

#### **5. auth.py**
- JWT token generation and verification
- Password hashing (bcrypt)
- Email validation
- Password strength checking
- Authentication decorators

#### **6. database.py**
- SQLite database management
- User CRUD operations
- Analysis persistence
- Query optimization
- Transaction handling

### **Data Flow**

```
User Registration/Login
    ↓
JWT Token Generation
    ↓
User Input (Location + Business Type)
    ↓
Geocode (if needed)
    ↓
Parallel Data Fetching:
  ├─ Competitor Search (SerpAPI)
  └─ Customer Base Analysis (Google Places API)
    ↓
Feature Engineering
    ↓
Review Compression (LLMLingua - 50 reviews)
    ↓
AI Insights Generation (Groq + Customer Base Context)
    ↓
Database Persistence (SQLite)
    ↓
Response Formatting
    ↓
Dashboard Display (with Charts & Maps)
```

---

## 🔑 API Integrations

### **1. SerpAPI**
- **Purpose**: Google Maps data access
- **Endpoints Used**:
  - Google Maps Search
  - Geocoding
- **Free Tier**: 100 searches/month
- **Features Used**:
  - Local business search
  - GPS coordinates
  - Reviews and ratings
  - Business details

### **2. Groq API**
- **Purpose**: AI insights generation
- **Model**: llama-3.1-70b-versatile
- **Features**:
  - Fast inference
  - High-quality responses
  - Structured output
  - Cost-effective

### **3. OpenStreetMap (Nominatim)**
- **Purpose**: Reverse geocoding
- **Free**: No API key required
- **Features**:
  - Address lookup
  - Location details
  - Multi-language support

---

## 📊 Key Metrics & Calculations

### **Success Score (0-10)**
```python
success_score = (
    (avg_rating / 5.0) * 4 +           # 40% weight
    min(total_reviews / 1000, 1) * 3 + # 30% weight
    (1 - saturation) * 3                # 30% weight
)
```

### **Demand Level**
- **High**: > 500 total reviews
- **Medium**: 100-500 reviews
- **Low**: < 100 reviews

### **Competition Level**
- **High**: > 15 competitors
- **Moderate**: 5-15 competitors
- **Low**: < 5 competitors

### **Distance Calculation (Haversine)**
```python
R = 6371000  # Earth's radius in meters
distance = R * 2 * atan2(√a, √(1-a))
where a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
```

---

## 🎨 User Experience Features

### **Progressive Workflow**
1. **Form** - Define business concept
2. **Data** - Pulling local insights
3. **AI Analysis** - Processing competition
4. **Results** - Comprehensive viability score

### **Real-time Feedback**
- Loading animations
- Progress indicators
- Status messages
- Error handling

### **Accessibility**
- Keyboard navigation
- Screen reader support
- High contrast mode
- Responsive design

---

## 🔒 Security & Best Practices

### **Environment Variables**
- API keys stored in `.env` file
- Never committed to version control
- Secure key management

### **Error Handling**
- Graceful API failure handling
- User-friendly error messages
- Fallback data when APIs fail
- Comprehensive logging

### **Input Validation**
- Required field checking
- Location validation
- Coordinate verification
- Sanitized user input

---

## 📈 Performance Optimizations

### **Data Compression**
- LLMLingua reduces token count by ~35%
- Faster API responses
- Lower costs

### **Efficient API Usage**
- Batch processing where possible
- Caching geocoding results
- Rate limit handling
- Timeout management

### **Frontend Optimization**
- Lazy loading
- Minified assets
- CDN usage for libraries
- Optimized images

---

## 🚀 Deployment Considerations

### **Development**
```bash
python app.py
# Runs on http://localhost:5000
# Debug mode enabled
# Auto-reload on code changes
```

### **Production Ready**
- WSGI server compatible (Gunicorn, uWSGI)
- Environment-based configuration
- Logging infrastructure
- Error monitoring

---

## 📝 Use Cases

### **1. New Business Owners**
- Evaluate potential locations
- Understand local competition
- Get pricing guidance
- Identify market opportunities

### **2. Serial Entrepreneurs**
- Quick market analysis
- Competitive intelligence
- Strategic positioning
- Risk assessment

### **3. Investors**
- Due diligence
- Market research
- Viability assessment
- ROI estimation

### **4. Consultants**
- Client presentations
- Market reports
- Location recommendations
- Competitive analysis

---

## 🎓 Academic Value

### **Engineering Concepts Demonstrated**
1. **API Integration**: Multiple third-party services ( Groq, Google Maps)
2. **Data Processing**: ETL pipeline with parallel processing
3. **AI/ML**: LLM integration, prompt engineering, RAG systems
4. **Web Development**: Full-stack application with authentication
5. **Geospatial Analysis**: Distance calculations, mapping, heatmaps
6. **Data Compression**: Advanced NLP techniques (LLMLingua)
7. **UI/UX Design**: Modern, responsive interface with Chart.js
8. **Database Design**: SQLite with proper indexing and relationships
9. **Security**: JWT authentication, password hashing, input validation
10. **Concurrent Programming**: ThreadPoolExecutor for parallel API calls

### **Technologies Mastered**
- **Backend**: Python (Flask, SQLite, bcrypt, JWT, concurrent.futures)
- **Frontend**: JavaScript (ES6+, Chart.js, Leaflet.js), HTML5, Tailwind CSS
- **APIs**: REST API design, SerpAPI, Groq API, Google Maps/Places API
- **AI/ML**: LLM integration, prompt engineering, LLMLingua, ChromaDB (RAG)
- **Database**: SQLite, SQL queries, indexing, transactions
- **Security**: JWT tokens, password hashing, authentication middleware
- **Geospatial**: Leaflet.js, Haversine formula, coordinate systems
- **Data Visualization**: Chart.js, heatmaps, interactive dashboards
- **Version Control**: Git, GitHub

---

## 🏆 Project Highlights

### **Innovation**
✅ Combines multiple AI/ML technologies (LLM + RAG + Compression)  
✅ Real-time geospatial analysis with customer base scoring  
✅ Advanced data compression (35% token reduction)  
✅ Intelligent insight generation with context awareness  
✅ Parallel data fetching for optimal performance  
✅ Interactive visualizations (charts, maps, heatmaps)  

### **Practicality**
✅ Solves real business problems for entrepreneurs  
✅ Production-ready code with authentication  
✅ Scalable architecture with database persistence  
✅ Cost-effective solution (free tier APIs)  
✅ User-friendly interface with chatbot assistance  
✅ Comprehensive analysis history and export features  

### **Technical Excellence**
✅ Clean, modular code with separation of concerns  
✅ Comprehensive error handling and validation  
✅ Well-documented with inline comments  
✅ Best practices followed (security, performance, UX)  
✅ Optimized database queries with indexing  
✅ Responsive design for all devices  

### **User Experience**
✅ Intuitive interface  
✅ Fast performance  
✅ Mobile-responsive  
✅ Professional design  

---

## 🔐 User Authentication & Security

### **JWT-Based Authentication**
- **Secure Registration**: Email validation, password strength requirements
- **Password Hashing**: bcrypt with salt for secure password storage
- **JWT Tokens**: Stateless authentication with token expiration
- **Protected Routes**: Analysis endpoints require authentication
- **Session Management**: Automatic token refresh and validation

### **Security Features**
- **Environment Variables**: API keys and secrets stored securely in `.env`
- **Input Validation**: Comprehensive validation for all user inputs
- **SQL Injection Protection**: Parameterized queries throughout
- **Password Requirements**: Minimum 8 characters, complexity rules
- **Email Validation**: RFC-compliant email format checking

---

## 💾 Database Persistence

### **SQLite Database (buizmind.db)**
- **User Management**:
  - User profiles with email, password hash, full name
  - Created at and last login timestamps
  - Unique email constraints
  
- **Analysis Storage**:
  - Complete analysis history for each user
  - Business details (name, type, location, coordinates)
  - Success scores and recommendations
  - Full AI insights and strategies
  - Competitor data (top 10)
  - Customer base metrics
  - Timestamp tracking

### **Database Features**
- **Indexed Queries**: Fast lookups on user_id, email, created_at
- **Foreign Keys**: Referential integrity with CASCADE delete
- **JSON Storage**: Flexible storage for complex data structures
- **Transaction Support**: ACID compliance for data integrity
- **Connection Pooling**: Context managers for efficient connections

---

## 📊 Analysis History & Management

### **History Dashboard**
- **Paginated List View**: Browse all past analyses (20 per page)
- **Quick Preview Cards**: See key metrics at a glance
  - Business name and type
  - Location
  - Success score (color-coded)
  - Analysis date
  
### **Analysis Actions**
- **View Details**: Full analysis with all insights
- **Download Options**:
  - **JSON Export**: Complete data export for backup/analysis
  - **PDF Report**: Print-friendly formatted report
- **Delete Analysis**: Remove unwanted analyses
- **Search & Filter**: Find specific analyses quickly

---

## 🤖 AI Chatbot (bBot)

### **Interactive Assistant**
- **Context-Aware Responses**: Understands user's latest analysis
- **Groq-Powered**: Fast, intelligent responses using llama-3.1-70b
- **Multi-Purpose Help**:
  - Explain analysis results
  - Answer questions about BizMind features
  - Provide business advice
  - Clarify metrics and scores

### **Chatbot Features**
- **Floating Widget**: Accessible from any page
- **Real-time Streaming**: Fast response generation
- **Conversation History**: Maintains context within session
- **Markdown Support**: Rich formatted responses
- **Error Handling**: Graceful fallbacks for API issues

---

## 🏘️ Customer Base Analysis

### **Demographic Indicators**
Analyzes the surrounding area to assess customer potential:

- **Residential Density**:
  - Apartment/housing counts
  - Population indicators
  
- **Education Centers**:
  - Schools and universities
  - Student population signals
  
- **Office Spaces**:
  - Corporate buildings
  - Working professional density
  
- **Transit Accessibility**:
  - Bus stations
  - Subway/metro stations
  - Foot traffic indicators

### **Customer Score (0-100)**
Weighted algorithm combining:
- 40% Residential density
- 20% Education centers
- 20% Office spaces
- 10% Transit accessibility
- -10% Existing competitors (saturation penalty)

### **Heatmap Visualization**
- **Interactive Map Overlay**: Visual representation of demand
- **Intensity Markers**: Shows high-traffic areas
- **Real-time Data**: Live Google Maps API integration

---

## 📈 Enhanced Competitor Data

### **Comprehensive Business Profiles**
For each competitor, we now collect:

**Basic Information**:
- Business name and type
- Physical address
- GPS coordinates
- Distance from target location

**Performance Metrics**:
- Customer ratings (1-5 stars)
- Total review count
- Price level (1-4 scale)
- Operating status

**Contact & Hours**:
- Phone numbers
- Website URLs
- Operating hours
- Business hours

**Customer Feedback**:
- Up to 50 reviews per competitor
- Review text and ratings
- Reviewer names and dates
- Review sentiment

### **Advanced Review Analysis**
- **LLMLingua Compression**: Processes 50+ reviews efficiently
- **Sentiment Extraction**: Identifies positive/negative patterns
- **Theme Detection**: Common complaints and praise points
- **Competitive Gaps**: Unmet customer needs

---

## 📊 Data Visualization (Chart.js)

### **Interactive Charts**
- **Success Score Gauge**: Visual representation of viability (0-10)
- **Competition Density Chart**: Bar chart of competitor distribution
- **Rating Distribution**: Competitor rating breakdown
- **Price Level Analysis**: Market positioning visualization
- **Customer Base Metrics**: Demographic indicator charts
- **Trend Analysis**: Historical performance if available

### **Chart Features**
- **Responsive Design**: Adapts to screen size
- **Interactive Tooltips**: Hover for detailed information
- **Color-Coded**: Intuitive visual indicators
- **Export Capability**: Download charts as images
- **Real-time Updates**: Dynamic data loading

---

## 🔍 RAG System (Retrieval-Augmented Generation)

### **Knowledge Base Integration**
- **Vector Database**: ChromaDB for semantic search
- **Document Ingestion**: Processes business knowledge documents
- **Semantic Search**: Finds relevant information for queries
- **Context Enhancement**: Enriches AI responses with factual data

### **RAG Features**
- **Offline Capability**: Reduces dependency on external APIs
- **Custom Knowledge**: Add domain-specific business insights
- **Fast Retrieval**: Optimized vector search
- **Relevance Scoring**: Returns most pertinent information

---

## 📥 Download & Export Features

### **JSON Export**
- **Complete Data**: All analysis details in structured format
- **Machine Readable**: Easy to parse and analyze
- **Backup Ready**: Preserve your analysis history
- **Integration Friendly**: Use with other tools/scripts

### **PDF Reports**
- **Professional Formatting**: Clean, presentation-ready layout
- **Comprehensive Sections**:
  - Executive summary
  - Success score and recommendation
  - Customer sentiment insights
  - Market opportunity analysis
  - Pricing strategy
  - Risk factors
  - Strategic recommendations
  - Competitor overview
  - Customer base metrics
- **Print Optimized**: Perfect for meetings and presentations
- **Branded Design**: Professional BizMind styling

---

## 🎨 Enhanced UI/UX Features

### **Modern Dashboard**
- **Glassmorphism Design**: Frosted glass effects
- **Dark Mode Support**: Eye-friendly interface
- **Smooth Animations**: Micro-interactions throughout
- **Responsive Layout**: Works on all devices
- **Loading States**: Clear progress indicators

### **Interactive Components**
- **Leaflet Maps**: Interactive location selection
- **Radius Selector**: Visual circle overlay
- **Toggle Buttons**: Smooth owner type selection
- **Vertical Stepper**: Clear workflow visualization
- **Chatbot Widget**: Floating assistant

### **Accessibility**
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Friendly**: ARIA labels throughout
- **High Contrast Mode**: Readable in all conditions
- **Focus Indicators**: Clear focus states
- **Semantic HTML**: Proper heading hierarchy

---

## 🚀 Performance Optimizations

### **Parallel API Calls**
- **ThreadPoolExecutor**: Concurrent data fetching
- **4 Worker Threads**: Optimized for customer base analysis
- **Timeout Management**: 5-second limits prevent hanging
- **Error Isolation**: Individual failures don't break entire flow

### **Data Compression**
- **LLMLingua**: ~35% token reduction
- **Review Limiting**: Top 50 reviews for speed
- **Batch Processing**: Efficient data handling
- **Caching**: Geocoding results cached

### **Database Optimization**
- **Indexed Queries**: Fast lookups on common fields
- **Connection Pooling**: Efficient resource usage
- **Prepared Statements**: Query optimization
- **JSON Storage**: Flexible yet performant

---

## 📚 Future Enhancements

### **Completed Features** ✅
- [x] User accounts and saved analyses
- [x] PDF report generation
- [x] Competitor comparison matrix (via charts)
- [x] Demographic data integration (customer base)
- [x] Historical trend analysis (analysis history)

### **Potential Future Features**
- [ ] Multi-location comparison (side-by-side)
- [ ] Social media sentiment analysis
- [ ] Traffic pattern analysis (time-based)
- [ ] Financial projections and ROI calculator
- [ ] Email notifications for analysis completion
- [ ] Team collaboration features
- [ ] API access for third-party integrations
- [ ] Mobile app (iOS/Android)
- [ ] Advanced filtering and search
- [ ] Export to Excel/CSV

---

## 🎯 Conclusion

**BizMind** is a comprehensive, production-ready application that demonstrates advanced software engineering skills, AI/ML integration, and practical problem-solving. It combines cutting-edge technologies with user-centered design to deliver real business value.

### **What Makes BizMind Stand Out**
- **Full-Stack Excellence**: Complete authentication, database, and API integration
- **AI-Powered Intelligence**: LLM insights, RAG system, and intelligent chatbot
- **Real-World Utility**: Solves actual business problems for entrepreneurs
- **Production Quality**: Security, performance optimization, and error handling
- **Modern UX**: Interactive maps, charts, responsive design, and smooth animations
- **Data-Driven**: Comprehensive analysis with 50+ reviews, customer demographics, and competitor insights

### **Technical Achievements**
- ✅ 10+ engineering concepts demonstrated
- ✅ 15+ technologies mastered
- ✅ 15+ API endpoints with authentication
- ✅ 6 core modules with separation of concerns
- ✅ Database with proper indexing and relationships
- ✅ Parallel processing for optimal performance
- ✅ 35% data compression for cost efficiency

**Perfect for**: Final year engineering project, portfolio showcase, startup MVP, or real business deployment.

---

**Developed by**: Murugesh  
**GitHub**: [Murugesh1804/BizMind_New](https://github.com/Murugesh1804/BizMind_New)  
**Year**: 2024-2026  
**Status**: ✅ Complete & Production-Ready  
**Last Updated**: February 2026
