"""
BizMind - AI Business Location Decision Support System
Main Flask Application

This is the core application file that handles:
- Route definitions
- Request handling
- Template rendering
- API orchestration
"""

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os

# Import custom modules
from modules.google_maps import GoogleMapsClient
from modules.feature_engineering import FeatureEngineer
from modules.llm_compression import LLMLinguaCompressor
from modules.openrouter import OpenRouterClient

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Initialize API clients
google_maps_client = GoogleMapsClient(api_key=os.getenv('SERPAPI_API_KEY'))
openrouter_client = OpenRouterClient(api_key=os.getenv('GROQ_API_KEY'))
feature_engineer = FeatureEngineer()
compressor = LLMLinguaCompressor()


@app.route('/')
def index():
    """
    Home page route - displays the input form
    """
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Main analysis endpoint
    
    Workflow:
    1. Receive user input
    2. Fetch competitor data from Google Maps
    3. Engineer features and calculate scores
    4. Compress data using LLMLingua
    5. Generate insights using OpenRouter LLM
    6. Return results to dashboard
    """
    try:
        # Step 1: Extract form data
        business_name = request.form.get('business_name', '').strip()
        business_type = request.form.get('business_type', '').strip()
        location = request.form.get('location', '').strip()
        owner_type = request.form.get('owner_type', 'new')
        
        # Validate input
        if not all([business_name, business_type, location]):
            return jsonify({
                'error': 'Missing required fields',
                'message': 'Please fill in all required fields'
            }), 400
        
        # Step 2: Fetch competitor data from Google Maps
        print(f"[INFO] Fetching competitor data for: {business_type} in {location}")
        competitors_data = google_maps_client.fetch_competitors(
            business_type=business_type,
            location=location
        )
        
        if not competitors_data or len(competitors_data) == 0:
            return jsonify({
                'error': 'No data found',
                'message': 'Could not find competitor data for this location'
            }), 404
        
        # Step 3: Feature engineering - calculate metrics
        print(f"[INFO] Engineering features from {len(competitors_data)} competitors")
        features = feature_engineer.calculate_features(competitors_data)
        
        # Step 4: Compress review data using LLMLingua
        print("[INFO] Compressing review data with LLMLingua")
        all_reviews = []
        for comp in competitors_data:
            all_reviews.extend(comp.get('reviews', []))
        
        compressed_reviews = compressor.compress_reviews(all_reviews)
        
        # Step 5: Generate AI insights using OpenRouter
        print("[INFO] Generating AI insights via OpenRouter")
        ai_insights = openrouter_client.generate_insights(
            business_name=business_name,
            business_type=business_type,
            location=location,
            owner_type=owner_type,
            features=features,
            compressed_reviews=compressed_reviews,
            competitors=competitors_data
        )
        
        # Step 6: Prepare final response
        response_data = {
            'business_name': business_name,
            'business_type': business_type,
            'location': location,
            'owner_type': owner_type,
            'success_score': features['success_score'],
            'recommendation': features['recommendation'],
            'features': features,
            'ai_insights': ai_insights,
            'competitors': competitors_data[:10]  # Top 10 for display
        }
        
        # Render dashboard with results
        return render_template('dashboard.html', data=response_data)
        
    except Exception as e:
        print(f"[ERROR] Analysis failed: {str(e)}")
        return jsonify({
            'error': 'Analysis failed',
            'message': str(e)
        }), 500


@app.route('/loading')
def loading():
    """
    Loading page shown during analysis
    """
    return render_template('loading.html')


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return render_template('index.html'), 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal server error',
        'message': 'Something went wrong. Please try again.'
    }), 500


if __name__ == '__main__':
    # Check for required environment variables
    required_vars = ['GROQ_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"[ERROR] Missing required environment variables: {', '.join(missing_vars)}")
        print("[INFO] Please create a .env file with your API keys")
        print("[INFO] See .env.example for template")
        exit(1)
    
    print("[INFO] Starting BizMind Flask Application")
    print("[INFO] Access the application at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
