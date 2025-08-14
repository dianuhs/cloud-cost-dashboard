#!/usr/bin/env python3
"""
Backend API Testing for FinOps Dashboard
Tests all backend functionality including API endpoints, static file serving, and database operations.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://costwise-1.preview.emergentagent.com"
API_BASE = "http://localhost:3000/api"  # Use localhost for API testing due to ingress routing issue

def log_test(test_name, status, message="", details=None):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_symbol} {test_name}: {message}")
    if details:
        print(f"    Details: {details}")
    print()

def test_api_health():
    """Test basic API health endpoints"""
    print("=" * 60)
    print("TESTING API HEALTH ENDPOINTS")
    print("=" * 60)
    
    # Test root endpoint
    try:
        response = requests.get(f"{API_BASE}/root", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                log_test("API Root Endpoint", "PASS", "Root endpoint responding correctly")
            else:
                log_test("API Root Endpoint", "FAIL", f"Unexpected response: {data}")
        else:
            log_test("API Root Endpoint", "FAIL", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test("API Root Endpoint", "FAIL", f"Request failed: {str(e)}")
    
    # Test base API endpoint
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                log_test("API Base Endpoint", "PASS", "Base endpoint responding correctly")
            else:
                log_test("API Base Endpoint", "FAIL", f"Unexpected response: {data}")
        else:
            log_test("API Base Endpoint", "FAIL", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test("API Base Endpoint", "FAIL", f"Request failed: {str(e)}")

def test_status_endpoints():
    """Test status check endpoints (POST and GET)"""
    print("=" * 60)
    print("TESTING STATUS ENDPOINTS")
    print("=" * 60)
    
    # Test POST /api/status
    test_client_name = f"test_client_{int(time.time())}"
    try:
        payload = {"client_name": test_client_name}
        response = requests.post(f"{API_BASE}/status", 
                               json=payload, 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("client_name") == test_client_name and "id" in data and "timestamp" in data:
                log_test("POST Status Endpoint", "PASS", "Status created successfully", 
                        f"ID: {data.get('id')}, Client: {data.get('client_name')}")
                created_id = data.get("id")
            else:
                log_test("POST Status Endpoint", "FAIL", f"Invalid response structure: {data}")
                created_id = None
        else:
            log_test("POST Status Endpoint", "FAIL", f"HTTP {response.status_code}: {response.text}")
            created_id = None
    except Exception as e:
        log_test("POST Status Endpoint", "FAIL", f"Request failed: {str(e)}")
        created_id = None
    
    # Test POST /api/status without client_name (should fail)
    try:
        response = requests.post(f"{API_BASE}/status", 
                               json={}, 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            if "client_name is required" in data.get("error", ""):
                log_test("POST Status Validation", "PASS", "Correctly validates missing client_name")
            else:
                log_test("POST Status Validation", "FAIL", f"Unexpected error message: {data}")
        else:
            log_test("POST Status Validation", "FAIL", f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("POST Status Validation", "FAIL", f"Request failed: {str(e)}")
    
    # Test GET /api/status
    try:
        response = requests.get(f"{API_BASE}/status", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Check if our created status is in the list
                found_our_status = any(item.get("client_name") == test_client_name for item in data)
                if found_our_status:
                    log_test("GET Status Endpoint", "PASS", f"Retrieved {len(data)} status records, including our test record")
                else:
                    log_test("GET Status Endpoint", "WARN", f"Retrieved {len(data)} status records, but our test record not found")
            else:
                log_test("GET Status Endpoint", "FAIL", f"Expected array, got: {type(data)}")
        else:
            log_test("GET Status Endpoint", "FAIL", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET Status Endpoint", "FAIL", f"Request failed: {str(e)}")

def test_static_file_serving():
    """Test static file serving, specifically the sample CSV"""
    print("=" * 60)
    print("TESTING STATIC FILE SERVING")
    print("=" * 60)
    
    # Test sample CSV file
    try:
        response = requests.get(f"{BASE_URL}/sample_billing.csv", timeout=10)
        
        if response.status_code == 200:
            content = response.text
            lines = content.strip().split('\n')
            
            # Check if it's a valid CSV with expected headers
            if len(lines) > 1:
                headers = lines[0].split(',')
                expected_headers = ['date', 'service', 'cost_usd', 'account', 'tag_env', 'region']
                
                if all(header in headers for header in expected_headers):
                    log_test("Sample CSV File", "PASS", f"CSV file served correctly with {len(lines)-1} data rows")
                else:
                    log_test("Sample CSV File", "FAIL", f"Missing expected headers. Got: {headers}")
            else:
                log_test("Sample CSV File", "FAIL", "CSV file appears to be empty or malformed")
        else:
            log_test("Sample CSV File", "FAIL", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Sample CSV File", "FAIL", f"Request failed: {str(e)}")

def test_cors_headers():
    """Test CORS headers are properly set"""
    print("=" * 60)
    print("TESTING CORS HEADERS")
    print("=" * 60)
    
    # Test OPTIONS request
    try:
        response = requests.options(f"{API_BASE}/status", timeout=10)
        
        if response.status_code == 200:
            headers = response.headers
            cors_headers = {
                'Access-Control-Allow-Origin': headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': headers.get('Access-Control-Allow-Headers'),
            }
            
            if all(value for value in cors_headers.values()):
                log_test("CORS Headers", "PASS", "All CORS headers present", str(cors_headers))
            else:
                log_test("CORS Headers", "FAIL", "Missing CORS headers", str(cors_headers))
        else:
            log_test("CORS Headers", "FAIL", f"OPTIONS request failed: HTTP {response.status_code}")
    except Exception as e:
        log_test("CORS Headers", "FAIL", f"Request failed: {str(e)}")

def test_error_handling():
    """Test error handling for invalid routes"""
    print("=" * 60)
    print("TESTING ERROR HANDLING")
    print("=" * 60)
    
    # Test invalid route
    try:
        response = requests.get(f"{API_BASE}/nonexistent", timeout=10)
        
        if response.status_code == 404:
            data = response.json()
            if "not found" in data.get("error", "").lower():
                log_test("404 Error Handling", "PASS", "Correctly returns 404 for invalid routes")
            else:
                log_test("404 Error Handling", "FAIL", f"Unexpected error message: {data}")
        else:
            log_test("404 Error Handling", "FAIL", f"Expected 404, got {response.status_code}")
    except Exception as e:
        log_test("404 Error Handling", "FAIL", f"Request failed: {str(e)}")

def test_response_times():
    """Test API response times"""
    print("=" * 60)
    print("TESTING RESPONSE TIMES")
    print("=" * 60)
    
    endpoints = [
        ("Root Endpoint", f"{API_BASE}/root"),
        ("Status GET", f"{API_BASE}/status"),
        ("Sample CSV", f"{BASE_URL}/sample_billing.csv")
    ]
    
    for name, url in endpoints:
        try:
            start_time = time.time()
            response = requests.get(url, timeout=10)
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            if response.status_code == 200:
                if response_time < 2000:  # Less than 2 seconds
                    log_test(f"{name} Response Time", "PASS", f"{response_time:.2f}ms")
                else:
                    log_test(f"{name} Response Time", "WARN", f"{response_time:.2f}ms (slow)")
            else:
                log_test(f"{name} Response Time", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            log_test(f"{name} Response Time", "FAIL", f"Request failed: {str(e)}")

def main():
    """Run all backend tests"""
    print("🚀 Starting FinOps Dashboard Backend Tests")
    print(f"🌐 Base URL: {BASE_URL}")
    print(f"🔗 API Base: {API_BASE}")
    print()
    
    # Run all test suites
    test_api_health()
    test_status_endpoints()
    test_static_file_serving()
    test_cors_headers()
    test_error_handling()
    test_response_times()
    
    print("=" * 60)
    print("🏁 BACKEND TESTING COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()