import requests
import sys

BASE_URL = 'http://localhost:5000/api'

# 1. Register a test user or login
def get_token():
    auth_data = {
        'email': 'test_debug@example.com',
        'password': 'password123',
        'full_name': 'Test Debug'
    }
    # Try register first
    res = requests.post(f"{BASE_URL}/auth/register", json=auth_data)
    if res.status_code != 201:
        # If exists, login
        res = requests.post(f"{BASE_URL}/auth/login", json={'email': 'test_debug@example.com', 'password': 'password123'})
    
    if res.status_code == 200 or res.status_code == 201:
        return res.json().get('token')
    print("Auth failed:", res.text)
    sys.exit(1)

token = get_token()
print("Got token, testing preview...")

headers = {'Authorization': f'Bearer {token}'}
payload = {
    'business_type': 'restaurant',
    'location': 'Chennai',
    'latitude': 13.0827,
    'longitude': 80.2707,
    'radius': 1000
}

res = requests.post(f"{BASE_URL}/preview", json=payload, headers=headers)
print("Status:", res.status_code)
print("Response:", res.text)
