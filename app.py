"""
BizMind - AI Business Location Decision Support System
Main Flask Application

This is the core application file that handles:
- Route definitions
- Request handling
- Template rendering
- API orchestration
- Authentication
- Database persistence
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file
from dotenv import load_dotenv
import os
import json
from io import BytesIO

# Import custom modules
from modules.google_maps import GoogleMapsClient
from modules.feature_engineering import FeatureEngineer
from modules.llm_compression import LLMLinguaCompressor
from modules.openrouter import OpenRouterClient
from modules.auth import create_auth_manager
from database import db

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Initialize API clients
google_maps_client = GoogleMapsClient(api_key=os.getenv('GOOGLE_MAP_API'))
openrouter_client = OpenRouterClient(api_key=os.getenv('GROQ_API_KEY'))
feature_engineer = FeatureEngineer()
compressor = LLMLinguaCompressor()

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
    customer_score = (
        apartments_count * 0.4
        + education_count * 0.2
        + offices_count * 0.2
        + transit_count * 0.1
        - competitors_count * 0.1
    )
    customer_score = max(0, min(100, customer_score))  # Clamp to 0-100
    
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
        "customer_score": round(customer_score, 2),
        "heatmap_points": heatmap_points
    }


# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@app.route('/register')
def register_page():
    """Registration page"""
    return render_template('register.html')


@app.route('/login')
def login_page():
    """Login page"""
    return render_template('login.html')


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
            'message': str(e)
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
            'message': str(e)
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
            'message': str(e)
        }), 500


# ============================================================================
# MAIN APPLICATION ROUTES
# ============================================================================

@app.route('/')
def index():
    """
    Home page route - displays the input form
    """
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
@auth_manager.require_auth
def analyze():
    """
    Main analysis endpoint (PROTECTED)
    
    Workflow:
    1. Receive user input
    2. Fetch competitor data from Google Maps
    3. Engineer features and calculate scores
    4. Compress data using LLMLingua
    5. Generate insights using OpenRouter LLM
    6. Save to database
    7. Return results to dashboard
    """
    try:
        # Get authenticated user
        user_id = request.current_user['user_id']
        
        # Step 1: Extract form data
        business_name = request.form.get('business_name', '').strip()
        business_type = request.form.get('business_type', '').strip()
        location = request.form.get('location', '').strip()
        latitude = request.form.get('latitude', '').strip()
        longitude = request.form.get('longitude', '').strip()
        owner_type = request.form.get('owner_type', 'new')
        radius = request.form.get('radius', '500').strip()  # Default 500m
        
        # Convert radius to int
        try:
            radius = int(radius)
        except ValueError:
            radius = 500  # Default to 500m if invalid
        
        # Validate input
        if not all([business_name, business_type, location]):
            return jsonify({
                'error': 'Missing required fields',
                'message': 'Please fill in all required fields'
            }), 400
        
        # Step 2: Geocode location if coordinates not provided
        if not latitude or not longitude:
            print(f"[INFO] No coordinates provided, geocoding location: {location}")
            coords = google_maps_client.geocode(location)
            if coords:
                latitude = coords['latitude']
                longitude = coords['longitude']
                print(f"[INFO] Geocoded to: {latitude}, {longitude}")
            else:
                print(f"[WARN] Geocoding failed, will search by location name only")
        
        # Step 3: Fetch competitor data from Google Maps
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
        
        # Step 4: Feature engineering - calculate metrics
        print(f"[INFO] Engineering features from {len(competitors_data)} competitors")
        features = feature_engineer.calculate_features(competitors_data)
        
        # Step 4.5: Fetch customer base data
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
        print("[INFO] Compressing review data with LLMLingua")
        all_reviews = []
        for comp in competitors_data:
            all_reviews.extend(comp.get('reviews', []))
        
        # Limit to 50 most recent/relevant reviews for faster processing
        all_reviews = all_reviews[:50]
        
        compressed_reviews = compressor.compress_reviews(all_reviews)
        
        # Step 6: Generate AI insights using OpenRouter
        print("[INFO] Generating AI insights via OpenRouter")
        ai_insights = openrouter_client.generate_insights(
            business_name=business_name,
            business_type=business_type,
            location=location,
            owner_type=owner_type,
            features=features,
            compressed_reviews=compressed_reviews,
            competitors=competitors_data,
            customer_base=customer_base  # NEW: Pass customer base data
        )
        
        # Step 7: Save analysis to database
        print("[INFO] Saving analysis to database")
        
        # Prepare strategy data (complete AI insights for storage)
        strategy_data = {
            'full_analysis': ai_insights.get('full_analysis', ''),
            'sentiment': ai_insights.get('sentiment', ''),
            'opportunity': ai_insights.get('opportunity', ''),
            'pricing': ai_insights.get('pricing', ''),
            'risks': ai_insights.get('risks', ''),
            'recommendations': ai_insights.get('recommendations', '')
        }
        
        analysis_id = db.create_analysis(
            user_id=user_id,
            business_name=business_name,
            business_type=business_type,
            location=location,
            latitude=float(latitude) if latitude else None,
            longitude=float(longitude) if longitude else None,
            radius=radius,
            owner_type=owner_type,
            success_score=features['success_score'],
            recommendation=features['recommendation'],
            features=features,
            ai_insights=ai_insights,
            competitors=competitors_data[:10],
            strategy=strategy_data
        )
        print(f"[INFO] Analysis saved with ID: {analysis_id}")
        
        # Step 8: Prepare final response
        response_data = {
            'analysis_id': analysis_id,
            'business_name': business_name,
            'business_type': business_type,
            'location': location,
            'owner_type': owner_type,
            'lat': float(latitude) if latitude else None,
            'lon': float(longitude) if longitude else None,
            'radius': radius,
            'success_score': features['success_score'],
            'recommendation': features['recommendation'],
            'features': features,
            'ai_insights': ai_insights,
            'competitors': competitors_data[:10],  # Top 10 for display
            # Customer base data
            'customer_score': customer_base.get('customer_score', 0),
            'apartments_count': customer_base.get('apartments_count', 0),
            'education_count': customer_base.get('education_count', 0),
            'offices_count': customer_base.get('offices_count', 0),
            'transit_count': customer_base.get('transit_count', 0),
            'heatmap_data': customer_base.get('heatmap_points', [])
        }
        
        # Render dashboard with results
        return render_template('dashboard.html', data=response_data, google_api_key=os.getenv('GOOGLE_MAP_API'))
        
    except Exception as e:
        print(f"[ERROR] Analysis failed: {str(e)}")
        return jsonify({
            'error': 'Analysis failed',
            'message': str(e)
        }), 500


# ============================================================================
# ANALYSIS HISTORY ROUTES
# ============================================================================

@app.route('/history')
def history_page():
    """Analysis history page (authentication handled by JavaScript)"""
    return render_template('history.html')


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
            'message': str(e)
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
            'analysis': analysis
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Get analysis failed: {str(e)}")
        return jsonify({
            'error': 'Failed to get analysis',
            'message': str(e)
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
            'message': str(e)
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
            'message': str(e)
        }), 500


# ============================================================================
# UTILITY ROUTES
# ============================================================================

@app.route('/loading')
def loading():
    """
    Loading page shown during analysis
    """
    return render_template('loading.html')


@app.route('/api/chat', methods=['POST'])
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

