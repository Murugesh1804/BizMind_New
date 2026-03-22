"""
BizMind - AI Business Location Decision Support System
Flask REST API Backend

This is the API-only backend. All HTML rendering is handled by the Next.js frontend.
This file handles:
- REST API route definitions
- Request handling and JSON responses
- API orchestration
- Authentication (JWT)
- Database persistence
"""

from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
from io import BytesIO
from datetime import datetime

# Import custom modules
from modules.google_maps import GoogleMapsClient
from modules.feature_engineering import FeatureEngineer
from modules.llm_compression import LLMLinguaCompressor
from modules.openrouter import OpenRouterClient  # Module uses Groq API (originally designed for OpenRouter; name kept for backward compat)
from modules.auth import create_auth_manager
from modules.revenue_engine import RevenueEngine
from modules.cost_intelligence import CostIntelligence
from modules.persona_engine import PersonaEngine
from modules.scenario_engine import ScenarioEngine
from modules.market_tracker import MarketTracker
from modules.finance import FinanceEngine
from modules.gov_schemes import GovSchemes
from modules.scraper import CompetitorScraper
from database import db

# Load environment variables
load_dotenv()

# Configure logging
import logging
logging.basicConfig(
    level=logging.DEBUG if os.getenv('FLASK_DEBUG', '').lower() in ('1', 'true') else logging.WARNING,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for Next.js frontend
CORS(app, origins=["http://localhost:5173","https://bizmind.tech"], supports_credentials=True)

# Security: Enforce environment variables for secrets in production
# Fallback strictly for local development only
if os.getenv('FLASK_ENV') == 'production':
    if not os.getenv('SECRET_KEY'):
        raise ValueError("No SECRET_KEY set for production application")
    if not os.getenv('GROQ_API_KEY'):
        raise ValueError("No GROQ_API_KEY set for production application")
    if not os.getenv('GOOGLE_MAP_API'):
        raise ValueError("No GOOGLE_MAP_API set for production application")
    if not os.getenv('JWT_SECRET'):
        raise ValueError("No JWT_SECRET set for production application")

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Initialize API clients
google_maps_client = GoogleMapsClient(api_key=os.getenv('GOOGLE_MAP_API'))
openrouter_client = OpenRouterClient(api_key=os.getenv('GROQ_API_KEY'))
feature_engineer = FeatureEngineer()
compressor = LLMLinguaCompressor()
revenue_engine = RevenueEngine()
cost_intel = CostIntelligence()
finance_engine = FinanceEngine(cost_intel, revenue_engine)
persona_engine = PersonaEngine()
gov_schemes_engine = GovSchemes()
scenario_engine = ScenarioEngine()
market_tracker = MarketTracker()

# Initialize authentication manager
auth_manager = create_auth_manager()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def fetch_customer_base_data(lat, lon, radius):
    """
    Fetch customer base indicators around a location (OPTIMIZED with parallel calls)
    
    Args:
        lat (float): Latitude
        lon (float): Longitude
        radius (int): Search radius in meters
        
    Returns:
        dict: Customer base metrics and score
    """
    import requests
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    API_KEY = os.getenv("GOOGLE_MAP_API")
    
    def get_places(place_type):
        """Fetch places of a specific type"""
        params = {
            "location": f"{lat},{lon}",
            "radius": radius,
            "type": place_type,
            "key": API_KEY,
        }
        try:
            res = requests.get(PLACES_URL, params=params, timeout=5)
            return place_type, res.json().get("results", [])
        except Exception as e:
            print(f"[WARN] Failed to fetch {place_type}: {str(e)}")
            return place_type, []
    
    # Fetch all place types in parallel (much faster!)
    place_types = ["apartment", "school", "university", "office", 
                   "bus_station", "subway_station", "cafe", "restaurant"]
    
    data = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(get_places, ptype): ptype for ptype in place_types}
        for future in as_completed(futures):
            place_type, results = future.result()
            data[place_type] = results
    
    # Calculate counts
    apartments_count = len(data.get("apartment", []))
    education_count = len(data.get("school", [])) + len(data.get("university", []))
    offices_count = len(data.get("office", []))
    transit_count = len(data.get("bus_station", [])) + len(data.get("subway_station", []))
    competitors_count = len(data.get("cafe", [])) + len(data.get("restaurant", []))
    
    # Calculate customer score (0-100 scale)
    # Normalize counts to expected ranges before scoring
    # Typical area has 0-50 apartments, 0-20 schools, 0-30 offices, 0-10 transit, 0-50 competitors
    apt_score      = min(apartments_count / 30.0, 1.0) * 40   # max 40 pts
    edu_score      = min(education_count  / 15.0, 1.0) * 20   # max 20 pts
    office_score   = min(offices_count    / 20.0, 1.0) * 20   # max 20 pts
    transit_score  = min(transit_count    / 10.0, 1.0) * 15   # max 15 pts
    comp_penalty   = min(competitors_count / 40.0, 1.0) * 5   # max  5 pts penalty
    customer_score = apt_score + edu_score + office_score + transit_score - comp_penalty
    customer_score = max(0, min(100, round(customer_score, 2)))  # Clamp to 0-100
    
    # Prepare heatmap points (cafes + restaurants as demand signal)
    heatmap_points = [
        {
            "lat": p["geometry"]["location"]["lat"],
            "lng": p["geometry"]["location"]["lng"],
            "intensity": 1.0
        }
        for p in (data.get("cafe", []) + data.get("restaurant", []))
    ]
    
    return {
        "apartments_count": apartments_count,
        "education_count": education_count,
        "offices_count": offices_count,
        "transit_count": transit_count,
        "customer_score": customer_score,
        "heatmap_points": heatmap_points
    }

def format_analysis_response(analysis_row):
    """
    Format a database analysis row into the flattened JSON structure
    expected by the Next.js frontend dashboard.
    """
    features    = analysis_row.get('features') or {}
    ai_insights = analysis_row.get('ai_insights') or {}
    competitors = analysis_row.get('competitors') or []
    strategy    = analysis_row.get('strategy') or {}
    
    # Get customer base dictionary (either from features or strategy depending on old data format)
    customer_base = features.get('customer_base', {})
    
    return {
        'id': analysis_row.get('id'),
        'analysis_id': analysis_row.get('id'),
        'business_name': analysis_row.get('business_name'),
        'business_type': analysis_row.get('business_type'),
        'location': analysis_row.get('location'),
        'owner_type': analysis_row.get('owner_type'),
        'budget': analysis_row.get('budget'),
        'latitude': analysis_row.get('latitude'),
        'longitude': analysis_row.get('longitude'),
        'radius': analysis_row.get('radius'),
        
        # Flattened features
        'success_score': analysis_row.get('success_score', 0),
        'recommendation': analysis_row.get('recommendation', ''),
        'market_saturation': features.get('market_saturation', 0),
        'avg_competitor_rating': features.get('avg_rating', 0),
        'competitors_count': features.get('competitor_count', len(competitors)),
        
        # Flattened AI insights
        'market_analysis': ai_insights.get('full_analysis', ai_insights.get('market_analysis', '')),
        'competitive_landscape': ai_insights.get('sentiment', ai_insights.get('competitive_landscape', '')),
        'customer_insights': ai_insights.get('opportunity', ai_insights.get('customer_insights', '')),
        'strategic_recommendations': ai_insights.get('recommendations', ai_insights.get('strategic_recommendations', '')),
        'risk_assessment': ai_insights.get('risks', ai_insights.get('risk_assessment', '')),
        'pricing_insights': ai_insights.get('pricing', ''),
        
        # Raw nested data (for advanced use/fallback)
        'features': features,
        'ai_insights': ai_insights,
        'competitors': competitors[:10],
        
        # Customer base data
        'customer_score': features.get('customer_score', customer_base.get('customer_score', 0)),
        'apartments_count': features.get('apartments_count', customer_base.get('apartments_count', 0)),
        'education_count': features.get('education_count', customer_base.get('education_count', 0)),
        'offices_count': features.get('offices_count', customer_base.get('offices_count', 0)),
        'transit_count': features.get('transit_count', customer_base.get('transit_count', 0)),
        'heatmap_data': customer_base.get('heatmap_points', []),
        
        # ── NEW FEATURE DATA ──────────────────────────────────────────
        'customer_persona':   strategy.get('customer_persona'),
        'cost_breakdown':     strategy.get('cost_breakdown'),
        'revenue_simulation': strategy.get('revenue_simulation'),
        'launch_strategy':    strategy.get('launch_strategy'),
        'marketing_intel':    strategy.get('marketing_intel'),
        'target_launch_date': analysis_row.get('target_launch_date'),
        'action_items_json':  analysis_row.get('action_items_json'),
        'gov_schemes_list':   strategy.get('gov_schemes'),
    }


# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """
    User registration endpoint
    
    Expected JSON:
    {
        "email": "user@example.com",
        "password": "password123",
        "full_name": "John Doe"
    }
    """
    try:
        data = request.get_json()
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        full_name = data.get('full_name', '').strip()
        
        # Validate input
        if not all([email, password, full_name]):
            return jsonify({
                'error': 'Missing required fields',
                'message': 'Email, password, and full name are required'
            }), 400
        
        # Validate email format
        if not auth_manager.validate_email(email):
            return jsonify({
                'error': 'Invalid email',
                'message': 'Please provide a valid email address'
            }), 400
        
        # Validate password strength
        is_valid, message = auth_manager.validate_password(password)
        if not is_valid:
            return jsonify({
                'error': 'Invalid password',
                'message': message
            }), 400
        
        # Check if user already exists
        existing_user = db.get_user_by_email(email)
        if existing_user:
            return jsonify({
                'error': 'User already exists',
                'message': 'An account with this email already exists'
            }), 409
        
        # Hash password and create user
        password_hash = auth_manager.hash_password(password)
        user_id = db.create_user(email, password_hash, full_name)
        
        # Generate JWT token
        token = auth_manager.generate_token(user_id, email)
        
        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user_id,
                'email': email,
                'full_name': full_name
            }
        }), 201
        
    except Exception as e:
        print(f"[ERROR] Registration failed: {str(e)}")
        return jsonify({
            'error': 'Registration failed',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    User login endpoint
    
    Expected JSON:
    {
        "email": "user@example.com",
        "password": "password123"
    }
    """
    try:
        data = request.get_json()
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate input
        if not all([email, password]):
            return jsonify({
                'error': 'Missing credentials',
                'message': 'Email and password are required'
            }), 400
        
        # Get user from database
        user = db.get_user_by_email(email)
        if not user:
            return jsonify({
                'error': 'Invalid credentials',
                'message': 'Email or password is incorrect'
            }), 401
        
        # Verify password
        if not auth_manager.verify_password(password, user['password_hash']):
            return jsonify({
                'error': 'Invalid credentials',
                'message': 'Email or password is incorrect'
            }), 401
        
        # Update last login
        db.update_last_login(user['id'])
        
        # Generate JWT token
        token = auth_manager.generate_token(user['id'], user['email'])
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name']
            }
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Login failed: {str(e)}")
        return jsonify({
            'error': 'Login failed',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500


@app.route('/api/auth/me', methods=['GET'])
@auth_manager.require_auth
def get_current_user():
    """Get current authenticated user info"""
    try:
        user_id = request.current_user['user_id']
        user = db.get_user_by_id(user_id)
        
        if not user:
            return jsonify({
                'error': 'User not found'
            }), 404
        
        return jsonify({
            'user': {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name'],
                'created_at': user['created_at']
            }
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Get user failed: {str(e)}")
        return jsonify({
            'error': 'Failed to get user info',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500



# ============================================================================
# PAGE ROUTES FOR NEW FEATURE PAGES
# ============================================================================

@app.route('/business-health')
def business_health_page():
    """Business Health Dashboard page"""
    return render_template('business_health.html')

@app.route('/market-tracker')
def market_tracker_page():
    """Live Market Tracker page"""
    return render_template('market_tracker.html')


# ============================================================================
# MAIN APPLICATION ROUTES
# ============================================================================

@app.route('/api/analyze', methods=['POST'])
@auth_manager.require_auth
def analyze():

    """
    Main analysis endpoint (PROTECTED) — now API-only
    Returns JSON instead of rendering a template.

    Workflow:
    1. Receive user input
    2. Fetch competitor data from Google Maps
    3. Engineer features and calculate scores
    4. Compress data using LLMLingua
    5. Generate insights using OpenRouter LLM
    6. Save to database
    7. Return JSON response
    """
    try:
        # Get authenticated user
        user_id = request.current_user['user_id']
        
        task_id = request.form.get('task_id', str(user_id)).strip()
        
        # Reset progress for this user
        db.set_analysis_progress(task_id, user_id, 0, "Starting analysis...", 5)
        
        # Step 1: Extract form data
        business_name = request.form.get('business_name', '').strip()
        business_type = request.form.get('business_type', '').strip()
        location = request.form.get('location', '').strip()
        latitude = request.form.get('latitude', '').strip()
        longitude = request.form.get('longitude', '').strip()
        owner_type = request.form.get('owner_type', 'new')
        radius = request.form.get('radius', '500').strip()  # Default 500m
        budget = request.form.get('budget', '0').strip()
        
        # Convert radius to int
        try:
            radius = int(radius)
        except ValueError:
            radius = 500  # Default to 500m if invalid
            
        # Convert budget to float
        try:
            budget = float(budget)
        except ValueError:
            budget = 0.0
        
        # Validate input
        if not all([business_name, business_type, location]):
            return jsonify({
                'error': 'Missing required fields',
                'message': 'Please fill in all required fields'
            }), 400
        
        # Step 2: Geocode location if coordinates not provided
        if not latitude or not longitude:
            db.set_analysis_progress(task_id, user_id, 0, "Identifying location coordinates...", 10)
            print(f"[INFO] No coordinates provided, geocoding location: {location}")
            coords = google_maps_client.geocode(location)
            if coords:
                latitude = coords['latitude']
                longitude = coords['longitude']
                print(f"[INFO] Geocoded to: {latitude}, {longitude}")
            else:
                print(f"[WARN] Geocoding failed, will search by location name only")
        
        # Step 3: Fetch competitor data from Google Maps
        db.set_analysis_progress(task_id, user_id, 1, "Scanning nearby competition...", 25)
        print(f"[INFO] Fetching competitor data for: {business_type} in {location}")
        
        # Pass coordinates if available for more precise search
        if latitude and longitude:
            print(f"[INFO] Using coordinates: {latitude}, {longitude} with {radius}m radius")
            competitors_data = google_maps_client.fetch_competitors(
                business_type=business_type,
                location=location,
                latitude=float(latitude),
                longitude=float(longitude),
                radius=radius
            )
        else:
            competitors_data = google_maps_client.fetch_competitors(
                business_type=business_type,
                location=location
            )
        
        if not competitors_data or len(competitors_data) == 0:
            return jsonify({
                'error': 'No data found',
                'message': 'Could not find competitor data for this location'
            }), 404
            
        # Step 3.5: Scrape real-world contact data for marketing intel
        db.set_analysis_progress(task_id, user_id, 1, "Scraping real-world marketing intel...", 35)
        print("[INFO] Initiating web scraper for competitor contact details")
        scraper = CompetitorScraper()
        competitors_data = scraper.scrape_competitors(competitors_data, location)
        
        # Step 3.6: Fetch local influencers & Gov schemes
        db.set_analysis_progress(task_id, user_id, 1, "Scraping local influencers & marketing intel...", 40)
        influencers = scraper.scrape_influencers(business_type, location)
        
        gov_schemes_api = GovSchemes()
        schemes = gov_schemes_api.get_schemes(business_type, location)
        
        # Step 4: Feature engineering - calculate metrics
        print(f"[INFO] Engineering features from {len(competitors_data)} competitors")
        features = feature_engineer.calculate_features(competitors_data, business_type)
        
        # Step 4.5: Fetch customer base data
        db.set_analysis_progress(task_id, user_id, 2, "Analyzing customer demographics...", 45)
        print("[INFO] Fetching customer base indicators...")
        customer_base = {}
        if latitude and longitude:
            try:
                customer_base = fetch_customer_base_data(float(latitude), float(longitude), radius)
                print(f"[INFO] Customer Score: {customer_base.get('customer_score', 0)}/100")
                print(f"[INFO] Found {customer_base.get('apartments_count', 0)} apartments, "
                      f"{customer_base.get('education_count', 0)} education centers, "
                      f"{customer_base.get('offices_count', 0)} offices, "
                      f"{customer_base.get('transit_count', 0)} transit points")
            except Exception as e:
                print(f"[WARN] Customer base fetching failed: {str(e)}")
                # Continue without customer base data
                customer_base = {
                    "apartments_count": 0,
                    "education_count": 0,
                    "offices_count": 0,
                    "transit_count": 0,
                    "customer_score": 0,
                    "heatmap_points": []
                }
        else:
            print("[WARN] No coordinates available, skipping customer base analysis")
            customer_base = {
                "apartments_count": 0,
                "education_count": 0,
                "offices_count": 0,
                "transit_count": 0,
                "customer_score": 0,
                "heatmap_points": []
            }
        
        # Step 5: Compress review data using LLMLingua (limit to 50 reviews for speed)
        db.set_analysis_progress(task_id, user_id, 3, "Processing customer sentiment...", 58)
        print("[INFO] Compressing review data with LLMLingua")
        all_reviews = []
        for comp in competitors_data:
            all_reviews.extend(comp.get('reviews', []))
        
        # Limit to 50 most recent/relevant reviews for faster processing
        all_reviews = all_reviews[:50]
        
        compressed_reviews = compressor.compress_reviews(all_reviews)
        
        # Step 5.5: Compute customer persona & cost intelligence (fast, local)
        db.set_analysis_progress(task_id, user_id, 3, "Profiling ideal customer...", 65)
        customer_persona = persona_engine.generate_persona(
            customer_base=customer_base,
            business_type=business_type,
            location=location,
            features=features
        )
        cost_breakdown = cost_intel.estimate(business_type=business_type, location=location)
        revenue_simulation = revenue_engine.simulate(
            business_type=business_type,
            location=location,
            features=features,
            customer_base=customer_base,
            initial_investment=budget if budget > 0 else None
        )
        
        # Step 6: Generate AI insights + strategy + marketing in parallel
        from concurrent.futures import ThreadPoolExecutor, as_completed
        db.set_analysis_progress(task_id, user_id, 4, "Generating strategic insights...", 75)
        print("[INFO] Generating AI insights (parallel: insights + strategy + marketing)")
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_insights = executor.submit(
                openrouter_client.generate_insights,
                business_name=business_name, business_type=business_type,
                location=location, owner_type=owner_type, budget=budget, features=features,
                compressed_reviews=compressed_reviews, competitors=competitors_data,
                customer_base=customer_base
            )
            future_strategy = executor.submit(
                openrouter_client.generate_launch_strategy,
                business_name=business_name, business_type=business_type,
                location=location, owner_type=owner_type, budget=budget, features=features,
                customer_persona=customer_persona, cost_breakdown=cost_breakdown,
                revenue_simulation=revenue_simulation
            )
            future_marketing = executor.submit(
                openrouter_client.generate_marketing_plan,
                business_type=business_type, location=location, budget=budget,
                customer_persona=customer_persona, features=features,
                cost_breakdown=cost_breakdown
            )
            ai_insights       = future_insights.result()
            launch_strategy   = future_strategy.result()
            marketing_intel   = future_marketing.result()
            
            # Attach scraped info
            marketing_intel['influencers'] = influencers
            ai_insights['gov_schemes_list'] = schemes
        
        print("[INFO] All AI insights generated successfully")
        
        # Step 7: Save analysis to database
        db.set_analysis_progress(task_id, user_id, 5, "Finalizing success scores & reports...", 90)
        print("[INFO] Saving analysis to database")
        
        # Prepare strategy data (complete AI insights for storage)
        strategy_data = {
            'full_analysis':        ai_insights.get('full_analysis', ''),
            'sentiment':            ai_insights.get('sentiment', ''),
            'opportunity':          ai_insights.get('opportunity', ''),
            'pricing':              ai_insights.get('pricing', ''),
            'risks':                ai_insights.get('risks', ''),
            'recommendations':      ai_insights.get('recommendations', ''),
            # New features
            'customer_persona':     customer_persona,
            'cost_breakdown':       cost_breakdown,
            'revenue_simulation':   revenue_simulation,
            'launch_strategy':      launch_strategy,
            'marketing_intel':      marketing_intel,
            'gov_schemes':          schemes,
        }
        
        # Ensure customer_base is merged into features so it gets saved as JSON in the database
        features['customer_base']      = customer_base
        # Flatten the most important customer_base fields directly into `features` so
        # get_analysis_by_id can expose them without an extra join / deserialization step
        features['customer_score']     = customer_base.get('customer_score', 0)
        features['apartments_count']   = customer_base.get('apartments_count', 0)
        features['transit_count']      = customer_base.get('transit_count', 0)
        features['offices_count']      = customer_base.get('offices_count', 0)
        features['education_count']    = customer_base.get('education_count', 0)


        analysis_id = db.create_analysis(
            user_id=user_id,
            business_name=business_name,
            business_type=business_type,
            location=location,
            latitude=float(latitude) if latitude else None,
            longitude=float(longitude) if longitude else None,
            radius=radius,
            owner_type=owner_type,
            budget=budget,
            success_score=features['success_score'],
            recommendation=features['recommendation'],
            features=features,
            ai_insights=ai_insights,
            competitors=competitors_data[:10],
            strategy=strategy_data
        )
        print(f"[INFO] Analysis saved with ID: {analysis_id}")
        
        # Step 8: Prepare final response (flattened for Next.js dashboard)
        # Fetch it back from DB to ensure all structure logic runs exactly the same
        new_analysis_row = db.get_analysis_by_id(analysis_id, user_id)
        if new_analysis_row:
            response_data = format_analysis_response(new_analysis_row)
        else:
            raise Exception("Failed to retrieve analysis from database after creation.")
        
        # Clear progress on completion
        db.clear_analysis_progress(task_id)
        
        # Return JSON response (dashboard rendered by Next.js frontend)
        return jsonify(response_data), 200
        
    except Exception as e:
        # Clear progress on failure
        if 'task_id' in locals():
            db.clear_analysis_progress(task_id)
        print(f"[ERROR] Analysis failed: {str(e)}")
        return jsonify({
            'error': 'Analysis failed',
            'message': 'Analysis could not be completed. Please try again.'
        }), 500



@app.route('/api/analyze/progress', methods=['GET'])
@auth_manager.require_auth
def get_analysis_progress():
    """
    Get current progress of analysis for the logged-in user
    """
    user_id = request.current_user['user_id']
    task_id = request.args.get('task_id', str(user_id))
    progress = db.get_analysis_progress(task_id)
    if not progress:
        progress = {"step": -1, "status": "idle", "progress": 0}
    return jsonify(progress), 200

@app.route('/api/analyze/<int:analysis_id>/launch-date', methods=['POST'])
@auth_manager.require_auth
def set_launch_date(analysis_id):
    """
    Set the target launch date for a specific analysis
    """
    try:
        user_id = request.current_user['user_id']
        data = request.get_json()
        launch_date = data.get('target_launch_date')
        
        if not launch_date:
            return jsonify({'error': 'target_launch_date is required'}), 400
            
        analysis = db.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return jsonify({'error': 'Analysis not found or unauthorized'}), 404
            
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE analyses SET target_launch_date = ? WHERE id = ? AND user_id = ?', 
                          (launch_date, analysis_id, user_id))
                          
        return jsonify({'success': True, 'target_launch_date': launch_date}), 200
    except Exception as e:
        print(f"[ERROR] set_launch_date failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500



# ============================================================================
# PHASE 1: QUICK PREVIEW ENDPOINT (before location lock)
# ============================================================================

@app.route('/api/preview', methods=['POST'])
@auth_manager.require_auth
def preview():
    """
    Phase 1 quick preview — runs before locking a location.
    Returns: basic competitor data, customer base score, and a 2-3 bullet AI opinion.
    """
    try:
        data = request.get_json() or {}
        business_type  = data.get('business_type', '').strip()
        location       = data.get('location', '').strip()
        latitude       = data.get('latitude')
        longitude      = data.get('longitude')
        radius         = int(data.get('radius', 1000))

        if not business_type or not location:
            return jsonify({'error': 'business_type and location are required'}), 400

        # Fetch basic competitor data
        if latitude and longitude:
            competitors = google_maps_client.fetch_competitors(
                business_type=business_type, location=location,
                latitude=float(latitude), longitude=float(longitude), radius=radius
            )
        else:
            competitors = google_maps_client.fetch_competitors(
                business_type=business_type, location=location
            )

        if not competitors:
            return jsonify({'error': 'No data found for this location', 'message': 'Try a different location or business type'}), 404

        # Calculate features
        features = feature_engineer.calculate_features(competitors, business_type)

        # Customer base
        customer_base = {}
        if latitude and longitude:
            try:
                customer_base = fetch_customer_base_data(float(latitude), float(longitude), radius)
            except Exception:
                customer_base = {'customer_score': 0, 'apartments_count': 0, 'education_count': 0,
                                 'offices_count': 0, 'transit_count': 0, 'heatmap_points': []}
        else:
            customer_base = {'customer_score': 0, 'apartments_count': 0, 'education_count': 0,
                             'offices_count': 0, 'transit_count': 0, 'heatmap_points': []}

        # Quick AI opinion (2-3 bullets)
        ai_opinion = openrouter_client.quick_preview_insight(
            business_type=business_type, location=location,
            features=features, customer_base=customer_base
        )

        top3 = competitors[:3]
        return jsonify({
            'preview': True,
            'competitor_count':   features.get('competitor_count', 0),
            'competition_level':  features.get('competition_level', 'Unknown'),
            'avg_rating':         features.get('avg_rating', 0),
            'demand_level':       features.get('demand_level', 'Unknown'),
            'success_score':      features.get('success_score', 0),
            'customer_score':     customer_base.get('customer_score', 0),
            'heatmap_data':       customer_base.get('heatmap_points', []),
            'ai_opinion':         ai_opinion,
            'top_competitors':    [
                {'name': c.get('name'), 'rating': c.get('rating'), 'distance': c.get('distance')}
                for c in top3
            ]
        }), 200

    except Exception as e:
        print(f"[ERROR] Preview failed: {str(e)}")
        return jsonify({'error': 'Preview failed', 'message': str(e)}), 500


# ============================================================================
# ANALYSIS HISTORY ROUTES
# ============================================================================


@app.route('/api/history', methods=['GET'])
@auth_manager.require_auth
def get_history():
    """
    Get user's analysis history
    
    Query params:
    - page: Page number (default: 1)
    - limit: Items per page (default: 20)
    """
    try:
        user_id = request.current_user['user_id']
        
        # Get pagination params
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        offset = (page - 1) * limit
        
        # Get analyses
        analyses = db.get_user_analyses(user_id, limit=limit, offset=offset)
        total_count = db.get_analysis_count(user_id)
        
        return jsonify({
            'analyses': analyses,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': (total_count + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Get history failed: {str(e)}")
        return jsonify({
            'error': 'Failed to get history',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500


@app.route('/api/history/<int:analysis_id>', methods=['GET'])
@auth_manager.require_auth
def get_analysis(analysis_id):
    """Get a specific analysis by ID"""
    try:
        user_id = request.current_user['user_id']
        
        analysis = db.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return jsonify({
                'error': 'Analysis not found',
                'message': 'Analysis not found or access denied'
            }), 404
        
        return jsonify({
            'analysis': format_analysis_response(analysis)
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Get analysis failed: {str(e)}")
        return jsonify({
            'error': 'Failed to get analysis',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500


@app.route('/api/history/<int:analysis_id>', methods=['DELETE'])
@auth_manager.require_auth
def delete_analysis(analysis_id):
    """Delete an analysis"""
    try:
        user_id = request.current_user['user_id']
        
        success = db.delete_analysis(analysis_id, user_id)
        if not success:
            return jsonify({
                'error': 'Analysis not found',
                'message': 'Analysis not found or access denied'
            }), 404
        
        return jsonify({
            'message': 'Analysis deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Delete analysis failed: {str(e)}")
        return jsonify({
            'error': 'Failed to delete analysis',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500


@app.route('/api/history/<int:analysis_id>/download', methods=['GET'])
@auth_manager.require_auth
def download_analysis(analysis_id):
    """Download an analysis as JSON or PDF"""
    try:
        user_id = request.current_user['user_id']
        format_type = request.args.get('format', 'json').lower()
        
        # Get analysis
        analysis = db.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return jsonify({
                'error': 'Analysis not found',
                'message': 'Analysis not found or access denied'
            }), 404
        
        if format_type == 'json':
            # Prepare JSON export
            export_data = {
                'id': analysis['id'],
                'business_name': analysis['business_name'],
                'business_type': analysis['business_type'],
                'location': analysis['location'],
                'created_at': analysis['created_at'],
                'success_score': analysis['success_score'],
                'recommendation': analysis['recommendation'],
                'features': analysis.get('features', {}),
                'ai_insights': analysis.get('ai_insights', {}),
                'strategy': analysis.get('strategy', {}),
                'competitors': analysis.get('competitors', [])
            }
            
            # Create in-memory file
            json_data = json.dumps(export_data, indent=2)
            buffer = BytesIO(json_data.encode('utf-8'))
            buffer.seek(0)
            
            filename = f"{analysis['business_name'].replace(' ', '_')}_analysis.json"
            
            return send_file(
                buffer,
                mimetype='application/json',
                as_attachment=True,
                download_name=filename
            )
        
        elif format_type == 'pdf':
            # For PDF, we'll return HTML that can be printed to PDF by the browser
            # This is simpler than server-side PDF generation
            return render_template('download_pdf.html', data=analysis)
        
        else:
            return jsonify({
                'error': 'Invalid format',
                'message': 'Format must be either "json" or "pdf"'
            }), 400
        
    except Exception as e:
        print(f"[ERROR] Download failed: {str(e)}")
        return jsonify({
            'error': 'Download failed',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500


# ============================================================================
# UTILITY ROUTES
# ============================================================================
# CHAT ROUTE
# ============================================================================


@app.route('/api/chat', methods=['POST'])
@auth_manager.require_auth
def chat():
    """
    Chatbot endpoint for bBot
    
    Expected JSON:
    {
        "message": "User's message"
    }
    """
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({
                'error': 'Missing message',
                'message': 'Please provide a message'
            }), 400
        
        # Get user context if authenticated
        context = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                payload = auth_manager.verify_token(token)
                if payload:
                    user_id = payload.get('user_id')
                    # Get user's latest analysis for context
                    analyses = db.get_user_analyses(user_id, limit=1, offset=0)
                    if analyses:
                        latest = analyses[0]
                        context = f"User's latest analysis: {latest['business_name']} ({latest['business_type']}) in {latest['location']}, Success Score: {latest['success_score']}/10"
            except:
                pass  # Continue without context if token verification fails
        
        # Generate response using Groq
        response_text = openrouter_client.chat(message, context)
        
        return jsonify({
            'response': response_text
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Chat failed: {str(e)}")
        return jsonify({
            'error': 'Chat failed',
            'message': 'Sorry, I encountered an error. Please try again.'
        }), 500

@app.route('/api/copilot/chat', methods=['POST'])
@auth_manager.require_auth
def copilot_chat():
    """
    COO Copilot endpoint.
    Retrieves the specific analysis and recent metrics as context.
    """
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        analysis_id = data.get('analysis_id')

        if not message or not analysis_id:
            return jsonify({'error': 'message and analysis_id are required'}), 400

        user_id = request.current_user['user_id']
        analysis = db.get_analysis_by_id(analysis_id, user_id)
        
        if not analysis:
            return jsonify({'error': 'Analysis not found or access denied'}), 404

        # Fetch recent metrics (last 7 days)
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM business_metrics 
                WHERE analysis_id = ? AND user_id = ?
                ORDER BY date DESC LIMIT 7
            ''', (analysis_id, user_id))
            recent_metrics = [dict(row) for row in cursor.fetchall()]

        # Generate COO response
        response_text = openrouter_client.copilot_chat(message, analysis, recent_metrics)

        return jsonify({'response': response_text}), 200

    except Exception as e:
        print(f"[ERROR] Copilot chat failed: {str(e)}")
        return jsonify({'error': 'Copilot failed', 'message': str(e)}), 500

# ============================================================================
# FEATURE 1 + 8: REVENUE SIMULATION & WHAT-IF SCENARIO ENGINE
# ============================================================================

@app.route('/api/simulate/revenue', methods=['POST'])
@auth_manager.require_auth
def simulate_revenue():
    """
    Run revenue & profit simulation for a saved or live analysis.

    Expected JSON:
    {
        "analysis_id": 123,              # or provide features/customer_base directly
        "shop_size_sqft": 300,           # optional override
        "num_employees": 4,              # optional override
        "initial_investment": 500000     # optional override
    }
    """
    try:
        user_id = request.current_user['user_id']
        data = request.get_json() or {}

        analysis_id       = data.get('analysis_id')
        shop_size_sqft    = data.get('shop_size_sqft')
        num_employees     = data.get('num_employees')
        initial_investment = data.get('initial_investment')

        if not analysis_id:
            return jsonify({'error': 'analysis_id is required'}), 400

        analysis = db.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return jsonify({'error': 'Analysis not found or access denied'}), 404

        features      = analysis.get('features') or {}
        customer_base = {'customer_score': 50}  # fallback

        # Try to get customer score from features_json
        if isinstance(features, dict) and 'customer_score' not in features:
            customer_base = {'customer_score': features.get('customer_score', 50)}

        simulation = revenue_engine.simulate(
            business_type=analysis['business_type'],
            location=analysis['location'],
            features=features,
            customer_base=customer_base,
            shop_size_sqft=shop_size_sqft,
            num_employees=num_employees,
            initial_investment=initial_investment
        )

        return jsonify({'simulation': simulation}), 200

    except Exception as e:
        print(f"[ERROR] Revenue simulation failed: {str(e)}")
        return jsonify({'error': 'Simulation failed', 'message': str(e)}), 500


@app.route('/api/simulate/scenario', methods=['POST'])
@auth_manager.require_auth
def simulate_scenario():
    """
    What-If Scenario Engine.

    Expected JSON:
    {
        "analysis_id": 123,
        "scenario": {"price_change_pct": -10}   # or rent_change_pct, employee_change, etc.
    }
    """
    try:
        user_id = request.current_user['user_id']
        data    = request.get_json() or {}

        analysis_id = data.get('analysis_id')
        scenario    = data.get('scenario', {})

        if not analysis_id or not scenario:
            return jsonify({'error': 'analysis_id and scenario are required'}), 400

        analysis = db.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return jsonify({'error': 'Analysis not found'}), 404

        features      = analysis.get('features') or {}
        customer_base = {'customer_score': 50}

        base_simulation = revenue_engine.simulate(
            business_type=analysis['business_type'],
            location=analysis['location'],
            features=features,
            customer_base=customer_base
        )

        result = scenario_engine.run(base_simulation, scenario)
        return jsonify({'scenario_result': result}), 200

    except Exception as e:
        print(f"[ERROR] Scenario simulation failed: {str(e)}")
        return jsonify({'error': 'Scenario simulation failed', 'message': str(e)}), 500


# ============================================================================
# FEATURE 7: A/B LOCATION COMPARISON
# ============================================================================

@app.route('/api/compare/locations', methods=['POST'])
@auth_manager.require_auth
def compare_locations():
    """
    Compare two saved analyses side by side.

    Expected JSON: {"analysis_id_a": 1, "analysis_id_b": 2}
    """
    try:
        user_id = request.current_user['user_id']
        data    = request.get_json() or {}

        id_a = data.get('analysis_id_a')
        id_b = data.get('analysis_id_b')

        if not id_a or not id_b:
            return jsonify({'error': 'Both analysis_id_a and analysis_id_b are required'}), 400

        a = db.get_analysis_by_id(id_a, user_id)
        b = db.get_analysis_by_id(id_b, user_id)

        if not a or not b:
            return jsonify({'error': 'One or both analyses not found'}), 404

        def build_summary(analysis):
            features = analysis.get('features') or {}
            
            # Fetch customer_base from features fallback, since we merged it earlier
            customer_base_feature = features.get('customer_base', {})
            customer_score = features.get('customer_score', customer_base_feature.get('customer_score', 50))
            customer_base_actual = {'customer_score': customer_score}

            sim = revenue_engine.simulate(
                business_type=analysis['business_type'],
                location=analysis['location'],
                features=features,
                customer_base=customer_base_actual
            )
            costs = cost_intel.estimate(
                business_type=analysis['business_type'],
                location=analysis['location']
            )
            return {
                'analysis_id':       analysis['id'],
                'business_name':     analysis['business_name'],
                'location':          analysis['location'],
                'success_score':     analysis.get('success_score', 0),
                'competition_level': features.get('competition_level', 'N/A'),
                'demand_level':      features.get('demand_level', 'N/A'),
                'avg_rating':        features.get('avg_rating', 0),
                'customer_score':    customer_score,
                'monthly_rent':      costs['monthly_costs']['rent'],
                'monthly_revenue_mid': sim['monthly_revenue']['mid'],
                'monthly_profit_mid':  sim['monthly_profit']['mid'],
                'break_even_months':   sim['break_even_months'],
                'location_tier':       sim['tier'],
            }

        loc_a = build_summary(a)
        loc_b = build_summary(b)
        
        # Simple rule-based generic recommendation
        score_diff = loc_a['success_score'] - loc_b['success_score']
        profit_diff = loc_a['monthly_profit_mid'] - loc_b['monthly_profit_mid']
        
        if score_diff >= 5 or (score_diff >= 0 and profit_diff > 0):
            recommendation = f"Location A ({loc_a['business_name']}) is better due to higher score and profitability."
        elif score_diff <= -5 or (score_diff <= 0 and profit_diff < 0):
            recommendation = f"Location B ({loc_b['business_name']}) is better due to higher score and profitability."
        else:
            recommendation = "Both locations are very competitive. Consider specific local factors or real estate terms before deciding."

        return jsonify({
            'location_a': loc_a,
            'location_b': loc_b,
            'recommendation': recommendation
        }), 200

    except Exception as e:
        print(f"[ERROR] Location comparison failed: {str(e)}")
        return jsonify({'error': 'Comparison failed', 'message': str(e)}), 500


# ============================================================================
# FEATURE 6: BUSINESS HEALTH DASHBOARD
# ============================================================================

@app.route('/api/business/metrics', methods=['POST'])
@auth_manager.require_auth
def submit_business_metrics():
    """
    Log a day's business performance.

    Expected JSON:
    {
        "analysis_id": 123,
        "date": "2026-03-15",
        "daily_revenue": 12000,
        "daily_expenses": 7000,
        "customer_count": 85,
        "notes": "Slow morning, busy evening"
    }
    """
    try:
        user_id = request.current_user['user_id']
        data    = request.get_json() or {}

        analysis_id    = data.get('analysis_id')
        date           = data.get('date')
        daily_revenue  = float(data.get('daily_revenue', 0))
        daily_expenses = float(data.get('daily_expenses', 0))
        customer_count = int(data.get('customer_count', 0))
        notes          = data.get('notes', '')

        if not analysis_id or not date:
            return jsonify({'error': 'analysis_id and date are required'}), 400

        # Verify analysis belongs to user
        analysis = db.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return jsonify({'error': 'Analysis not found or access denied'}), 404

        metric_id = db.add_business_metric(
            analysis_id=analysis_id, user_id=user_id, date=date,
            daily_revenue=daily_revenue, daily_expenses=daily_expenses,
            customer_count=customer_count, notes=notes
        )

        return jsonify({'message': 'Metric saved', 'id': metric_id}), 201

    except Exception as e:
        print(f"[ERROR] Business metrics submit failed: {str(e)}")
        return jsonify({'error': 'Failed to save metric', 'message': str(e)}), 500


@app.route('/api/business/metrics/<int:analysis_id>', methods=['GET'])
@auth_manager.require_auth
def get_business_metrics(analysis_id):
    """
    Get business health data for an analysis with trend summary.
    """
    try:
        user_id = request.current_user['user_id']
        days    = int(request.args.get('days', 30))

        # Verify ownership
        analysis = db.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return jsonify({'error': 'Analysis not found'}), 404

        metrics = db.get_business_metrics(analysis_id, user_id, days=days)

        if not metrics:
            return jsonify({'metrics': [], 'trend': None}), 200

        # Calculate trend summary
        total_rev  = sum(m['daily_revenue'] for m in metrics)
        total_exp  = sum(m['daily_expenses'] for m in metrics)
        total_cust = sum(m['customer_count'] for m in metrics)
        days_count = len(metrics)

        trend = {
            'avg_daily_revenue':   round(total_rev  / days_count, 2),
            'avg_daily_expenses':  round(total_exp  / days_count, 2),
            'avg_daily_profit':    round((total_rev - total_exp) / days_count, 2),
            'avg_daily_customers': round(total_cust / days_count, 1),
            'total_revenue':       round(total_rev, 2),
            'total_expenses':      round(total_exp, 2),
            'net_profit':          round(total_rev - total_exp, 2),
            'days_tracked':        days_count
        }

        return jsonify({'metrics': metrics, 'trend': trend}), 200

    except Exception as e:
        print(f"[ERROR] Get business metrics failed: {str(e)}")
        return jsonify({'error': 'Failed to get metrics', 'message': str(e)}), 500


# ============================================================================
# FEATURE 5: LIVE MARKET TRACKING
# ============================================================================

@app.route('/api/market/track/<int:analysis_id>', methods=['GET'])
@auth_manager.require_auth
def track_market(analysis_id):
    """
    Re-fetch competitor data and compare against last snapshot.
    Returns market change alerts.
    """
    try:
        user_id = request.current_user['user_id']

        analysis = db.get_analysis_by_id(analysis_id, user_id)
        if not analysis:
            return jsonify({'error': 'Analysis not found'}), 404

        lat = analysis.get('latitude')
        lon = analysis.get('longitude')
        radius = analysis.get('radius', 1000)

        if not lat or not lon:
            return jsonify({'error': 'No coordinates on this analysis for re-fetching'}), 400

        # Fresh competitor fetch
        fresh_competitors = google_maps_client.fetch_competitors(
            business_type=analysis['business_type'],
            location=analysis['location'],
            latitude=lat, longitude=lon, radius=radius
        )

        if not fresh_competitors:
            return jsonify({'error': 'Could not fetch fresh market data'}), 503

        fresh_features = feature_engineer.calculate_features(fresh_competitors, analysis['business_type'])

        # Get old snapshot
        old_snap_row = db.get_latest_snapshot(analysis_id)
        old_snap_json = old_snap_row['snapshot_json'] if old_snap_row else None

        # Diff and generate alerts
        result = market_tracker.diff_and_alert(
            old_snapshot_json=old_snap_json,
            competitors=fresh_competitors,
            features=fresh_features,
            analysis=analysis
        )

        # Save new snapshot
        db.save_market_snapshot(
            analysis_id=analysis_id,
            snapshot_json=json.dumps(result['new_snapshot']),
            alerts_json=json.dumps(result['alerts'])
        )

        return jsonify({
            'analysis_id': analysis_id,
            'checked_at':  result['checked_at'],
            'alerts':      result['alerts'],
            'delta':       result['delta'],
            'current': {
                'competitor_count': fresh_features.get('competitor_count'),
                'avg_rating':       fresh_features.get('avg_rating'),
                'demand_level':     fresh_features.get('demand_level'),
            }
        }), 200

    except Exception as e:
        print(f"[ERROR] Market tracking failed: {str(e)}")
        return jsonify({'error': 'Market tracking failed', 'message': str(e)}), 500


# ============================================================================
# FEATURE 10: FEEDBACK → LEARNING LOOP
# ============================================================================

@app.route('/api/feedback', methods=['POST'])
@auth_manager.require_auth
def submit_feedback():
    """
    Submit post-launch feedback on an analysis.

    Expected JSON:
    {
        "analysis_id": 123,
        "success_status": "succeeded" | "failed" | "ongoing",
        "actual_monthly_revenue": 120000,
        "issues": "High rent was a problem",
        "notes": "Should have targeted lunch crowd more"
    }
    """
    try:
        user_id = request.current_user['user_id']
        data    = request.get_json() or {}

        analysis_id    = data.get('analysis_id')
        success_status = data.get('success_status', 'ongoing')
        actual_revenue = data.get('actual_monthly_revenue')
        issues         = data.get('issues', '')
        notes          = data.get('notes', '')

        if success_status not in ('succeeded', 'failed', 'ongoing'):
            return jsonify({'error': 'success_status must be: succeeded, failed, or ongoing'}), 400

        feedback_id = db.save_feedback(
            user_id=user_id, analysis_id=analysis_id,
            success_status=success_status, actual_revenue=actual_revenue,
            issues=issues, notes=notes
        )

        return jsonify({'message': 'Feedback saved. Thank you!', 'id': feedback_id}), 201

    except Exception as e:
        print(f"[ERROR] Feedback submit failed: {str(e)}")
        return jsonify({'error': 'Failed to save feedback', 'message': str(e)}), 500


@app.route('/api/feedback/my', methods=['GET'])
@auth_manager.require_auth
def get_my_feedback():
    """Get all feedback submitted by the logged-in user"""
    try:
        user_id = request.current_user['user_id']
        feedback = db.get_user_feedback(user_id)
        return jsonify({'feedback': feedback}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to get feedback', 'message': str(e)}), 500


@app.errorhandler(404)

def not_found(e):
    """Handle 404 errors"""
    return jsonify({'error': 'Not found', 'message': 'The requested resource was not found'}), 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal server error',
        'message': 'Something went wrong. Please try again.'
    }), 500


@app.route('/api/finance/analysis', methods=['POST'])
@auth_manager.require_auth
def get_financial_analysis():
    """
    Get financial analysis for a given business.
    """
    try:
        user_id = request.current_user['user_id']
        data = request.get_json() or {}

        business_type = data.get('business_type')
        location = data.get('location')
        features = data.get('features')
        customer_base = data.get('customer_base')

        if not all([business_type, location, features, customer_base]):
            return jsonify({'error': 'Missing required fields'}), 400

        financial_analysis = finance_engine.get_financial_analysis(
            business_type, location, features, customer_base
        )

        return jsonify(financial_analysis), 200

    except Exception as e:
        print(f"[ERROR] Financial analysis failed: {str(e)}")
        return jsonify({'error': 'Financial analysis failed', 'message': str(e)}), 500


@app.route('/api/gov-schemes', methods=['POST'])
@auth_manager.require_auth
def get_gov_schemes():
    """
    Get a list of applicable government schemes.
    """
    try:
        data = request.get_json() or {}
        business_type = data.get('business_type')
        location = data.get('location')

        if not all([business_type, location]):
            return jsonify({'error': 'Missing required fields'}), 400

        schemes = gov_schemes_engine.get_schemes(business_type, location)
        return jsonify(schemes), 200

    except Exception as e:
        print(f"[ERROR] Failed to get government schemes: {str(e)}")
        return jsonify({'error': 'Failed to get government schemes', 'message': str(e)}), 500



if __name__ == '__main__':
    # Check for required environment variables
    required_vars = ['GROQ_API_KEY', 'JWT_SECRET', 'GOOGLE_MAP_API']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"[ERROR] Missing required environment variables: {', '.join(missing_vars)}")
        print("[INFO] Please create a .env file with your API keys")
        print("[INFO] See .env.example for template")
        exit(1)
    
    print("[INFO] Starting BizMind Flask Application")
    print("[INFO] Access the application at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)

