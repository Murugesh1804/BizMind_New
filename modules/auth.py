"""
BizMind - Authentication Module
Handles user authentication, JWT tokens, and password hashing
"""

import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import re


class AuthManager:
    """Authentication and authorization manager"""
    
    def __init__(self, secret_key, token_expiry_days=7):
        """Initialize auth manager"""
        self.secret_key = secret_key
        self.token_expiry_days = token_expiry_days
        self.algorithm = 'HS256'
    
    def hash_password(self, password):
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password, password_hash):
        """Verify a password against its hash"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            password_hash.encode('utf-8')
        )
    
    def generate_token(self, user_id, email):
        """Generate a JWT token for a user"""
        payload = {
            'user_id': user_id,
            'email': email,
            'exp': datetime.utcnow() + timedelta(days=self.token_expiry_days),
            'iat': datetime.utcnow()
        }
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
    
    def verify_token(self, token):
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def validate_email(self, email):
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_password(self, password):
        """Validate password strength"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        return True, "Password is valid"
    
    def get_token_from_request(self):
        """Extract JWT token from request headers"""
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        
        # Expected format: "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None
        
        return parts[1]
    
    def require_auth(self, f):
        """Decorator to protect routes with authentication"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = self.get_token_from_request()
            
            if not token:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'No token provided'
                }), 401
            
            payload = self.verify_token(token)
            if not payload:
                return jsonify({
                    'error': 'Authentication failed',
                    'message': 'Invalid or expired token'
                }), 401
            
            # Add user info to request context
            request.current_user = {
                'user_id': payload['user_id'],
                'email': payload['email']
            }
            
            return f(*args, **kwargs)
        
        return decorated_function


def create_auth_manager():
    """Factory function to create auth manager with environment config"""
    secret_key = os.getenv('JWT_SECRET', 'dev-secret-key-change-in-production')
    return AuthManager(secret_key=secret_key, token_expiry_days=7)
