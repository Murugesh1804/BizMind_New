# BizMind - AI Business Location Decision Support System

![BizMind](https://img.shields.io/badge/Status-Production%20Ready-success)
![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Flask](https://img.shields.io/badge/Flask-2.3-green)

## 📋 Project Overview

**BizMind** is an AI-powered Business Location Decision Support System designed as a final-year engineering project. It helps entrepreneurs make data-driven decisions about business location viability by analyzing competitor data, customer sentiment, and market conditions.

### Key Features

- 🗺️ **Google Maps Integration** - Fetch real competitor data and reviews
- 🤖 **AI-Powered Insights** - LLM-generated market analysis via OpenRouter
- 📊 **Feature Engineering** - Mathematical scoring algorithms
- 🔧 **Token Compression** - LLMLingua optimization for cost reduction
- 📱 **Responsive Design** - Clean, mobile-friendly interface
- 📈 **Success Scoring** - 0-10 scale viability assessment

---

## 🏗️ Project Structure

```
BuizMind - New/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
│
├── modules/                   # Backend modules
│   ├── __init__.py
│   ├── google_maps.py        # Google Maps API integration
│   ├── feature_engineering.py # Scoring algorithms
│   ├── llm_compression.py    # LLMLingua compression
│   └── openrouter.py         # OpenRouter LLM client
│
├── templates/                 # HTML templates
│   ├── index.html            # Home page with input form
│   ├── dashboard.html        # Results dashboard
│   └── loading.html          # Loading animation page
│
└── static/                    # Static assets
    └── css/
        └── style.css         # Custom CSS styles
```

---

## 🚀 Installation & Setup

### Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Google Maps API key
- OpenRouter API key

### Step 1: Clone or Navigate to Project

```bash
cd "C:\Users\dhana\Major\BuizMind - New"
```

### Step 2: Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

**Note:** LLMLingua installation may take a few minutes as it downloads ML models.

### Step 4: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` file and add your API keys:
   ```
   GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
   OPENROUTER_API_KEY=your_actual_openrouter_api_key
   SECRET_KEY=your_random_secret_key
   ```

#### Getting API Keys

**Google Maps API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Places API" and "Geocoding API"
4. Create credentials → API Key
5. Copy the API key

**OpenRouter API:**
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up for free account
3. Navigate to [API Keys](https://openrouter.ai/keys)
4. Create new API key
5. Copy the API key

### Step 5: Run the Application

```bash
python app.py
```

You should see:
```
[INFO] Starting BizMind Flask Application
[INFO] Access the application at: http://localhost:5000
 * Running on http://0.0.0.0:5000
```

### Step 6: Access the Application

Open your web browser and navigate to:
```
http://localhost:5000
```

---

## 📖 How to Use

### 1. Enter Business Details

On the home page, fill in:
- **Business Name**: Your proposed business name
- **Business Type**: Type of business (e.g., "cafe", "restaurant", "gym")
- **Target Location**: City, neighborhood, or address
- **Owner Type**: New or existing business owner

### 2. Submit for Analysis

Click "Analyze Location" button. The system will:
1. Geocode your location
2. Search for nearby competitors
3. Fetch ratings and reviews
4. Calculate success metrics
5. Generate AI insights

### 3. Review Dashboard

The dashboard displays:
- **Success Score** (0-10 scale)
- **Recommendation** (Strongly Recommended / Moderate / Not Recommended)
- **Key Metrics**: Competition level, demand, ratings, opportunity
- **AI Insights**: Sentiment, market analysis, pricing, risks, recommendations
- **Competitor Table**: Top competitors with ratings

---

## 🧮 Algorithm Explanation (For Viva)

### Success Score Formula

```
Success Score = (
    0.25 × Competition Score +
    0.25 × Rating Score +
    0.30 × Demand Score +
    0.20 × Opportunity Score
) × 10
```

**Where:**
- **Competition Score** = 1 - min(competitor_count / 30, 1.0)
  - Lower competition = Higher score
- **Rating Score** = average_rating / 5.0
  - Market quality indicator
- **Demand Score** = min(total_reviews / 1000, 1.0)
  - Review volume indicates demand
- **Opportunity Score** = Weighted combination of above factors
  - Identifies market gaps

### Recommendation Logic

- **7-10**: Strongly Recommended (Good opportunity)
- **4-6**: Moderate Potential (Proceed with caution)
- **0-3**: Not Recommended (High risk)

---

## 🔧 Troubleshooting

### Common Issues

**1. Module Import Errors**
```bash
# Ensure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

**2. API Key Errors**
- Verify `.env` file exists and contains valid keys
- Check API key permissions in respective consoles
- Ensure no extra spaces in `.env` file

**3. LLMLingua Installation Issues**
```bash
# Install without LLMLingua (uses fallback compression)
pip install Flask requests python-dotenv
```

**4. Port Already in Use**
```bash
# Change port in app.py (last line)
app.run(debug=True, host='0.0.0.0', port=5001)
```

---

## 📊 Demo Data

For testing without API calls, you can use:
- **Business Type**: "cafe" or "restaurant"
- **Location**: "Andheri West, Mumbai" or "Koramangala, Bangalore"

---

## 🎓 Academic Notes

### Technologies Demonstrated

1. **Web Development**: Flask, HTML, CSS, Bootstrap
2. **API Integration**: RESTful APIs, JSON handling
3. **Machine Learning**: Feature engineering, NLP via LLM
4. **Data Processing**: Token compression, data aggregation
5. **Software Engineering**: Modular architecture, error handling

### Key Concepts for Viva

- **Feature Engineering**: Converting raw data into meaningful metrics
- **Prompt Engineering**: Structured prompts for deterministic LLM outputs
- **Token Optimization**: Reducing API costs via compression
- **RESTful Architecture**: Clean separation of concerns
- **Responsive Design**: Mobile-first approach

---

## 📝 License

This is an academic project for educational purposes.

---

## 👥 Credits

**Developed by:** [Your Name]  
**Project Guide:** [Guide Name]  
**Institution:** [Your College Name]  
**Year:** 2024

**APIs Used:**
- Google Maps Places API
- OpenRouter API (Meta Llama 3.1)
- LLMLingua (Microsoft Research)

---

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Contact project guide

---

**Happy Analyzing! 🚀**
