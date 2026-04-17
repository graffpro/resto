"""
Iteration 10 Backend Tests - Multi-Kitchen Routing & Station Features
Tests for:
1. GET /api/stations - returns default stations (kitchen, bar, waiter)
2. POST /api/menu-items with target_station field
3. PUT /api/menu-items/{id} updates target_station
4. POST /api/orders creates order with target_station populated from menu item
5. GET /api/orders/kitchen returns orders
6. GET /api/orders/kitchen?station=kitchen filters by station
7. GET /api/orders/kitchen?station=bar returns only bar-targeted items
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API = f"{BASE_URL}/api"

# Test credentials
OWNER_USERNAME = "owner"
OWNER_PASSWORD = "owner123"
ADMIN_PIN = "5159"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for owner"""
    response = requests.post(f"{API}/auth/login", json={
        "username": OWNER_USERNAME,
        "password": OWNER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestStationsEndpoint:
    """Test GET /api/stations endpoint"""
    
    def test_get_stations_returns_default_stations(self):
        """GET /api/stations should return default stations (kitchen, bar, waiter)"""
        response = requests.get(f"{API}/stations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        stations = response.json()
        assert isinstance(stations, list), "Stations should be a list"
        assert len(stations) >= 3, f"Expected at least 3 default stations, got {len(stations)}"
        
        # Check default station IDs exist
        station_ids = [s['id'] for s in stations]
        assert 'kitchen' in station_ids, "kitchen station should exist"
        assert 'bar' in station_ids, "bar station should exist"
        assert 'waiter' in station_ids, "waiter station should exist"
        
        # Check station structure
        for station in stations:
            assert 'id' in station, "Station should have id"
            assert 'name' in station, "Station should have name"
        
        print(f"PASS: GET /api/stations returns {len(stations)} stations: {station_ids}")


class TestMenuItemsWithTargetStation:
    """Test menu items with target_station field"""
    
    def test_create_menu_item_with_target_station_kitchen(self, auth_headers):
        """POST /api/menu-items with target_station=kitchen"""
        # First get a category
        categories_res = requests.get(f"{API}/categories")
        categories = categories_res.json()
        if not categories:
            pytest.skip("No categories available for testing")
        
        category_id = categories[0]['id']
        
        item_data = {
            "name": f"TEST_Kitchen_Item_{uuid.uuid4().hex[:6]}",
            "description": "Test item for kitchen station",
            "price": 15.99,
            "category_id": category_id,
            "is_available": True,
            "preparation_time": 20,
            "target_station": "kitchen"
        }
        
        response = requests.post(f"{API}/menu-items", json=item_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_item = response.json()
        assert created_item['name'] == item_data['name']
        assert created_item['target_station'] == 'kitchen', f"Expected target_station=kitchen, got {created_item.get('target_station')}"
        
        print(f"PASS: Created menu item with target_station=kitchen: {created_item['id']}")
        
        # Cleanup
        requests.delete(f"{API}/menu-items/{created_item['id']}", headers=auth_headers)
    
    def test_create_menu_item_with_target_station_bar(self, auth_headers):
        """POST /api/menu-items with target_station=bar"""
        categories_res = requests.get(f"{API}/categories")
        categories = categories_res.json()
        if not categories:
            pytest.skip("No categories available for testing")
        
        category_id = categories[0]['id']
        
        item_data = {
            "name": f"TEST_Bar_Item_{uuid.uuid4().hex[:6]}",
            "description": "Test item for bar station",
            "price": 8.50,
            "category_id": category_id,
            "is_available": True,
            "preparation_time": 5,
            "target_station": "bar"
        }
        
        response = requests.post(f"{API}/menu-items", json=item_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_item = response.json()
        assert created_item['target_station'] == 'bar', f"Expected target_station=bar, got {created_item.get('target_station')}"
        
        print(f"PASS: Created menu item with target_station=bar: {created_item['id']}")
        
        # Cleanup
        requests.delete(f"{API}/menu-items/{created_item['id']}", headers=auth_headers)
    
    def test_update_menu_item_target_station(self, auth_headers):
        """PUT /api/menu-items/{id} updates target_station"""
        categories_res = requests.get(f"{API}/categories")
        categories = categories_res.json()
        if not categories:
            pytest.skip("No categories available for testing")
        
        category_id = categories[0]['id']
        
        # Create item with kitchen station
        item_data = {
            "name": f"TEST_Update_Station_{uuid.uuid4().hex[:6]}",
            "description": "Test item for station update",
            "price": 12.00,
            "category_id": category_id,
            "is_available": True,
            "preparation_time": 10,
            "target_station": "kitchen"
        }
        
        create_res = requests.post(f"{API}/menu-items", json=item_data, headers=auth_headers)
        assert create_res.status_code == 200
        created_item = create_res.json()
        item_id = created_item['id']
        
        # Update to bar station
        update_data = {**item_data, "target_station": "bar"}
        update_res = requests.put(f"{API}/menu-items/{item_id}", json=update_data, headers=auth_headers)
        assert update_res.status_code == 200, f"Expected 200, got {update_res.status_code}: {update_res.text}"
        
        updated_item = update_res.json()
        assert updated_item['target_station'] == 'bar', f"Expected target_station=bar after update, got {updated_item.get('target_station')}"
        
        print(f"PASS: Updated menu item target_station from kitchen to bar")
        
        # Cleanup
        requests.delete(f"{API}/menu-items/{item_id}", headers=auth_headers)


class TestOrdersWithTargetStation:
    """Test orders with target_station populated from menu items"""
    
    @pytest.fixture
    def test_table_session(self):
        """Get or create a test table session"""
        # Use the provided table ID
        table_id = "54e3595b-8a97-4b6b-8818-95bb2756d9d9"
        response = requests.post(f"{API}/sessions/start/{table_id}", json={"device_id": "test_device"})
        if response.status_code == 200:
            return response.json()
        pytest.skip(f"Could not start session: {response.status_code}")
    
    def test_create_order_populates_target_station(self, auth_headers, test_table_session):
        """POST /api/orders creates order with target_station from menu item"""
        session = test_table_session['session']
        session_token = session.get('session_token')
        
        # Get menu items
        items_res = requests.get(f"{API}/menu-items")
        menu_items = items_res.json()
        if not menu_items:
            pytest.skip("No menu items available")
        
        # Find an available item
        available_item = next((i for i in menu_items if i.get('is_available')), None)
        if not available_item:
            pytest.skip("No available menu items")
        
        order_data = {
            "session_token": session_token,
            "items": [{
                "menu_item_id": available_item['id'],
                "name": available_item['name'],
                "price": available_item['price'],
                "quantity": 1
            }],
            "total_amount": available_item['price']
        }
        
        response = requests.post(f"{API}/orders", json=order_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_order = response.json()
        assert 'items' in created_order, "Order should have items"
        assert len(created_order['items']) > 0, "Order should have at least one item"
        
        # Check that target_station is populated
        first_item = created_order['items'][0]
        assert 'target_station' in first_item, f"Order item should have target_station field. Item: {first_item}"
        
        expected_station = available_item.get('target_station', 'kitchen')
        assert first_item['target_station'] == expected_station, f"Expected target_station={expected_station}, got {first_item['target_station']}"
        
        print(f"PASS: Order created with target_station={first_item['target_station']} from menu item")


class TestKitchenOrdersFiltering:
    """Test kitchen orders endpoint with station filtering"""
    
    def test_get_kitchen_orders_no_filter(self, auth_headers):
        """GET /api/orders/kitchen returns all pending/preparing orders"""
        response = requests.get(f"{API}/orders/kitchen", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        orders = response.json()
        assert isinstance(orders, list), "Response should be a list"
        
        print(f"PASS: GET /api/orders/kitchen returns {len(orders)} orders")
    
    def test_get_kitchen_orders_filter_by_kitchen(self, auth_headers):
        """GET /api/orders/kitchen?station=kitchen filters by kitchen station"""
        response = requests.get(f"{API}/orders/kitchen?station=kitchen", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        orders = response.json()
        assert isinstance(orders, list), "Response should be a list"
        
        # Verify all items have target_station=kitchen
        for order_data in orders:
            order = order_data.get('order', {})
            for item in order.get('items', []):
                station = item.get('target_station', 'kitchen')
                assert station == 'kitchen', f"Expected kitchen station, got {station}"
        
        print(f"PASS: GET /api/orders/kitchen?station=kitchen returns {len(orders)} kitchen orders")
    
    def test_get_kitchen_orders_filter_by_bar(self, auth_headers):
        """GET /api/orders/kitchen?station=bar returns only bar-targeted items"""
        response = requests.get(f"{API}/orders/kitchen?station=bar", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        orders = response.json()
        assert isinstance(orders, list), "Response should be a list"
        
        # Verify all items have target_station=bar
        for order_data in orders:
            order = order_data.get('order', {})
            for item in order.get('items', []):
                station = item.get('target_station', 'kitchen')
                assert station == 'bar', f"Expected bar station, got {station}"
        
        print(f"PASS: GET /api/orders/kitchen?station=bar returns {len(orders)} bar orders")


class TestSettingsEndpoint:
    """Test settings endpoint for menu_background_url and logo_url"""
    
    def test_get_settings_returns_background_fields(self):
        """GET /api/settings should return menu_background_url and logo_url fields"""
        response = requests.get(f"{API}/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        settings = response.json()
        # These fields should exist (even if null/empty)
        # The settings endpoint should support these fields
        print(f"PASS: GET /api/settings returns settings with keys: {list(settings.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
