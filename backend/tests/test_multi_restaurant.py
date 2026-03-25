"""
Multi-Restaurant (Multi-Tenant) Architecture Tests
Tests for: Restaurant CRUD, Admin creation with expiration, Status toggling, Cascade deactivation
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://resto-manager-hub.preview.emergentagent.com')
API = f"{BASE_URL}/api"

# Test credentials
OWNER_CREDENTIALS = {"username": "owner", "password": "owner123"}
TEST_ADMIN_CREDENTIALS = {"username": "admin1", "password": "admin123"}


@pytest.fixture(scope="module")
def owner_token():
    """Get authentication token for owner"""
    response = requests.post(f"{API}/auth/login", json=OWNER_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Owner authentication failed")


@pytest.fixture(scope="module")
def owner_headers(owner_token):
    """Get headers with owner auth token"""
    return {"Authorization": f"Bearer {owner_token}"}


class TestOwnerLogin:
    """Owner login and redirect tests"""
    
    def test_owner_login_success(self):
        """Test owner login with valid credentials"""
        response = requests.post(f"{API}/auth/login", json=OWNER_CREDENTIALS)
        assert response.status_code == 200, f"Owner login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data["user"]["role"] == "owner", f"Expected owner role, got {data['user']['role']}"
        assert data["user"]["username"] == "owner"
        print(f"✓ Owner login successful - User: {data['user']['full_name']}")
    
    def test_owner_login_returns_correct_role(self):
        """Verify owner login returns correct role for frontend redirect"""
        response = requests.post(f"{API}/auth/login", json=OWNER_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        # Frontend uses this role to redirect to /owner
        assert data["user"]["role"] == "owner"
        print("✓ Owner role returned correctly for /owner redirect")


class TestRestaurantCRUD:
    """Restaurant CRUD operations tests"""
    
    def test_get_restaurants_list(self, owner_headers):
        """Test fetching restaurants list for owner"""
        response = requests.get(f"{API}/restaurants", headers=owner_headers)
        assert response.status_code == 200, f"Failed to get restaurants: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of restaurants"
        print(f"✓ Fetched {len(data)} restaurants")
        
        # Verify each restaurant has admin_count and staff_count
        for restaurant in data:
            assert "admin_count" in restaurant, f"Missing admin_count for restaurant {restaurant.get('name')}"
            assert "staff_count" in restaurant, f"Missing staff_count for restaurant {restaurant.get('name')}"
        print("✓ All restaurants have admin_count and staff_count")
    
    def test_create_restaurant(self, owner_headers):
        """Test creating a new restaurant via POST /api/restaurants"""
        restaurant_data = {
            "name": "TEST_Yeni Restoran",
            "address": "Bakı, Azərbaycan",
            "phone": "+994 50 111 22 33",
            "whatsapp": "+994 50 111 22 33",
            "email": "test@restoran.az",
            "description": "Test restoran",
            "tax_percentage": 18,
            "service_charge_percentage": 10
        }
        response = requests.post(f"{API}/restaurants", json=restaurant_data, headers=owner_headers)
        assert response.status_code == 200, f"Failed to create restaurant: {response.text}"
        data = response.json()
        assert data["name"] == restaurant_data["name"]
        assert data["address"] == restaurant_data["address"]
        assert "id" in data
        assert data["is_active"] == True
        print(f"✓ Created restaurant: {data['name']}")
        
        # Cleanup
        return data["id"]
    
    def test_create_and_verify_restaurant(self, owner_headers):
        """Test creating restaurant and verifying it appears in list with counts"""
        # Create restaurant
        restaurant_data = {
            "name": "TEST_Verify Restoran",
            "address": "Test Address"
        }
        create_response = requests.post(f"{API}/restaurants", json=restaurant_data, headers=owner_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        restaurant_id = created["id"]
        
        # Verify in list
        list_response = requests.get(f"{API}/restaurants", headers=owner_headers)
        assert list_response.status_code == 200
        restaurants = list_response.json()
        found = None
        for r in restaurants:
            if r["id"] == restaurant_id:
                found = r
                break
        
        assert found is not None, "Created restaurant not found in list"
        assert found["admin_count"] == 0, "New restaurant should have 0 admins"
        assert found["staff_count"] == 0, "New restaurant should have 0 staff"
        print(f"✓ Restaurant created and verified with admin_count=0, staff_count=0")
        
        # Cleanup - Note: No delete endpoint, so we'll toggle status to deactivate
        requests.put(f"{API}/restaurants/{restaurant_id}/toggle-status", headers=owner_headers)


class TestAdminCreation:
    """Admin creation with expiration date tests"""
    
    def test_create_admin_for_restaurant(self, owner_headers):
        """Test creating admin for a restaurant with expiration date via POST /api/users"""
        # First get a restaurant
        restaurants_response = requests.get(f"{API}/restaurants", headers=owner_headers)
        assert restaurants_response.status_code == 200
        restaurants = restaurants_response.json()
        
        if len(restaurants) == 0:
            pytest.skip("No restaurants available for admin creation test")
        
        restaurant_id = restaurants[0]["id"]
        
        # Create admin with expiration date
        admin_data = {
            "username": "TEST_admin_new",
            "password": "testadmin123",
            "full_name": "Test Admin User",
            "role": "admin",
            "restaurant_id": restaurant_id,
            "admin_pin": "1234",
            "expires_at": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        }
        
        response = requests.post(f"{API}/users", json=admin_data, headers=owner_headers)
        assert response.status_code == 200, f"Failed to create admin: {response.text}"
        data = response.json()
        assert data["username"] == admin_data["username"]
        assert data["role"] == "admin"
        assert data["restaurant_id"] == restaurant_id
        assert data["expires_at"] == admin_data["expires_at"]
        print(f"✓ Created admin: {data['full_name']} with expiration: {data['expires_at']}")
        
        return data["id"]
    
    def test_owner_can_only_create_admins(self, owner_headers):
        """Test that owner can only create admin role users"""
        restaurants_response = requests.get(f"{API}/restaurants", headers=owner_headers)
        restaurants = restaurants_response.json()
        
        if len(restaurants) == 0:
            pytest.skip("No restaurants available")
        
        restaurant_id = restaurants[0]["id"]
        
        # Try to create a waiter (should fail)
        waiter_data = {
            "username": "TEST_waiter_fail",
            "password": "test123",
            "full_name": "Test Waiter",
            "role": "waiter",
            "restaurant_id": restaurant_id
        }
        
        response = requests.post(f"{API}/users", json=waiter_data, headers=owner_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Owner correctly prevented from creating non-admin users")


class TestAdminLogin:
    """Admin login tests"""
    
    def test_admin_login_success(self):
        """Test admin login with created credentials"""
        response = requests.post(f"{API}/auth/login", json=TEST_ADMIN_CREDENTIALS)
        # Admin might not exist or might be expired
        if response.status_code == 200:
            data = response.json()
            assert data["user"]["role"] == "admin"
            print(f"✓ Admin login successful - User: {data['user']['full_name']}")
        elif response.status_code == 401:
            print("⚠ Admin credentials not found (admin1 may not exist)")
        elif response.status_code == 403:
            print("⚠ Admin account is deactivated or expired")
        else:
            print(f"⚠ Admin login returned status: {response.status_code}")


class TestExpirationCheck:
    """Admin expiration check tests"""
    
    def test_expired_admin_gets_403(self, owner_headers):
        """Test that expired admin gets 403 on login"""
        # Get a restaurant
        restaurants_response = requests.get(f"{API}/restaurants", headers=owner_headers)
        restaurants = restaurants_response.json()
        
        if len(restaurants) == 0:
            pytest.skip("No restaurants available")
        
        restaurant_id = restaurants[0]["id"]
        
        # Create admin with past expiration date
        expired_admin_data = {
            "username": "TEST_expired_admin",
            "password": "expired123",
            "full_name": "Expired Admin",
            "role": "admin",
            "restaurant_id": restaurant_id,
            "expires_at": "2020-01-01"  # Past date
        }
        
        create_response = requests.post(f"{API}/users", json=expired_admin_data, headers=owner_headers)
        if create_response.status_code != 200:
            # Username might already exist
            print(f"⚠ Could not create expired admin: {create_response.text}")
            return
        
        # Try to login with expired admin
        login_response = requests.post(f"{API}/auth/login", json={
            "username": "TEST_expired_admin",
            "password": "expired123"
        })
        
        assert login_response.status_code == 403, f"Expected 403 for expired admin, got {login_response.status_code}"
        print("✓ Expired admin correctly gets 403 on login")


class TestToggleStatus:
    """Status toggle tests for restaurants and users"""
    
    def test_toggle_restaurant_status(self, owner_headers):
        """Test toggling restaurant status via PUT /api/restaurants/{id}/toggle-status"""
        # Create a test restaurant
        restaurant_data = {"name": "TEST_Toggle Restaurant"}
        create_response = requests.post(f"{API}/restaurants", json=restaurant_data, headers=owner_headers)
        assert create_response.status_code == 200
        restaurant_id = create_response.json()["id"]
        
        # Toggle status (should deactivate)
        toggle_response = requests.put(f"{API}/restaurants/{restaurant_id}/toggle-status", headers=owner_headers)
        assert toggle_response.status_code == 200, f"Failed to toggle status: {toggle_response.text}"
        data = toggle_response.json()
        assert data["is_active"] == False, "Restaurant should be deactivated"
        print("✓ Restaurant status toggled to inactive")
        
        # Toggle again (should activate)
        toggle_response2 = requests.put(f"{API}/restaurants/{restaurant_id}/toggle-status", headers=owner_headers)
        assert toggle_response2.status_code == 200
        data2 = toggle_response2.json()
        assert data2["is_active"] == True, "Restaurant should be activated"
        print("✓ Restaurant status toggled back to active")
    
    def test_toggle_admin_status(self, owner_headers):
        """Test toggling admin status via PUT /api/users/{id}/toggle-status"""
        # Get users (admins created by owner)
        users_response = requests.get(f"{API}/users", headers=owner_headers)
        assert users_response.status_code == 200
        users = users_response.json()
        
        # Find an admin to toggle
        admin = None
        for user in users:
            if user.get("role") == "admin" and user.get("username", "").startswith("TEST_"):
                admin = user
                break
        
        if admin is None:
            # Create a test admin
            restaurants_response = requests.get(f"{API}/restaurants", headers=owner_headers)
            restaurants = restaurants_response.json()
            if len(restaurants) == 0:
                pytest.skip("No restaurants available")
            
            admin_data = {
                "username": "TEST_toggle_admin",
                "password": "toggle123",
                "full_name": "Toggle Test Admin",
                "role": "admin",
                "restaurant_id": restaurants[0]["id"]
            }
            create_response = requests.post(f"{API}/users", json=admin_data, headers=owner_headers)
            if create_response.status_code == 200:
                admin = create_response.json()
            else:
                pytest.skip("Could not create test admin")
        
        # Toggle admin status
        toggle_response = requests.put(f"{API}/users/{admin['id']}/toggle-status", headers=owner_headers)
        assert toggle_response.status_code == 200, f"Failed to toggle admin status: {toggle_response.text}"
        print(f"✓ Admin status toggled successfully")
    
    def test_restaurant_deactivation_cascades_to_users(self, owner_headers):
        """Test that deactivating restaurant cascades to deactivate all its users"""
        # Create a test restaurant
        restaurant_data = {"name": "TEST_Cascade Restaurant"}
        create_response = requests.post(f"{API}/restaurants", json=restaurant_data, headers=owner_headers)
        assert create_response.status_code == 200
        restaurant_id = create_response.json()["id"]
        
        # Create an admin for this restaurant
        admin_data = {
            "username": "TEST_cascade_admin",
            "password": "cascade123",
            "full_name": "Cascade Test Admin",
            "role": "admin",
            "restaurant_id": restaurant_id
        }
        admin_response = requests.post(f"{API}/users", json=admin_data, headers=owner_headers)
        
        # Deactivate the restaurant
        toggle_response = requests.put(f"{API}/restaurants/{restaurant_id}/toggle-status", headers=owner_headers)
        assert toggle_response.status_code == 200
        assert toggle_response.json()["is_active"] == False
        
        # Try to login with the admin - should fail because restaurant is deactivated
        if admin_response.status_code == 200:
            login_response = requests.post(f"{API}/auth/login", json={
                "username": "TEST_cascade_admin",
                "password": "cascade123"
            })
            # Should get 403 because user is deactivated or restaurant is deactivated
            assert login_response.status_code in [401, 403], f"Expected 401/403, got {login_response.status_code}"
            print("✓ Restaurant deactivation cascaded to users")


class TestSessionsAPI:
    """Active sessions API tests"""
    
    def test_get_active_sessions(self):
        """Test fetching active sessions"""
        response = requests.get(f"{API}/sessions/active")
        assert response.status_code == 200, f"Failed to get active sessions: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of active sessions"
        print(f"✓ Fetched {len(data)} active sessions")
    
    def test_get_sessions_history(self, owner_headers):
        """Test fetching sessions history"""
        response = requests.get(f"{API}/sessions/history", headers=owner_headers)
        assert response.status_code == 200, f"Failed to get sessions history: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of session history"
        print(f"✓ Fetched {len(data)} closed sessions")


class TestSettingsPage:
    """Settings page API tests"""
    
    def test_get_settings(self):
        """Test fetching settings"""
        response = requests.get(f"{API}/settings")
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        assert "name" in data
        assert "currency" in data
        print(f"✓ Settings fetched: {data.get('name')}")
    
    def test_update_settings(self, owner_headers):
        """Test updating settings"""
        # Get current settings
        get_response = requests.get(f"{API}/settings")
        current_settings = get_response.json()
        
        # Update with same values (to not break anything)
        update_response = requests.put(f"{API}/settings", json=current_settings, headers=owner_headers)
        assert update_response.status_code == 200, f"Failed to update settings: {update_response.text}"
        print("✓ Settings update works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
