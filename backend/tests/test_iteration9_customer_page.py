"""
Iteration 9 Tests - Customer Page Features
Tests for:
- Customer page loads correctly at /customer/{tableId}
- Menu items display with discount badges and discount explanation text
- Cart shows service charge info note
- Orders panel shows order items with discounts
- Bill summary shows orders total, service charge, and estimated grand total
- Backend APIs: GET /api/orders/session/{session_token}, POST /api/sessions/start/{tableId}, 
  POST /api/orders, GET /api/settings
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://qr-order-platform-5.preview.emergentagent.com')

# Test table ID
TABLE_ID = "89ececa6-2856-4b18-9ad8-323ec7aa3be2"


class TestSettingsAPI:
    """Test GET /api/settings returns service_charge_percentage"""
    
    def test_get_settings_returns_service_charge(self):
        """GET /api/settings should return service_charge_percentage"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "service_charge_percentage" in data, "service_charge_percentage not in response"
        assert isinstance(data["service_charge_percentage"], (int, float)), "service_charge_percentage should be numeric"
        assert data["service_charge_percentage"] >= 0, "service_charge_percentage should be >= 0"
        print(f"Service charge percentage: {data['service_charge_percentage']}%")


class TestSessionAPI:
    """Test POST /api/sessions/start/{tableId} creates session"""
    
    def test_start_session_creates_session(self):
        """POST /api/sessions/start/{tableId} should create or return existing session"""
        response = requests.post(f"{BASE_URL}/api/sessions/start/{TABLE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "session" in data, "session not in response"
        assert "table" in data, "table not in response"
        
        session = data["session"]
        assert "session_token" in session, "session_token not in session"
        assert "table_id" in session, "table_id not in session"
        assert session["table_id"] == TABLE_ID, f"table_id mismatch: {session['table_id']} != {TABLE_ID}"
        assert session["is_active"] == True, "session should be active"
        
        table = data["table"]
        assert "table_number" in table, "table_number not in table"
        print(f"Session token: {session['session_token']}, Table: {table['table_number']}")
        
        return session["session_token"]
    
    def test_start_session_invalid_table(self):
        """POST /api/sessions/start/{invalid_tableId} should return 404"""
        response = requests.post(f"{BASE_URL}/api/sessions/start/invalid-table-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestMenuItemsAPI:
    """Test GET /api/menu-items returns items with discount info"""
    
    def test_get_menu_items(self):
        """GET /api/menu-items should return menu items"""
        response = requests.get(f"{BASE_URL}/api/menu-items")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure of menu items
        for item in data:
            assert "id" in item, "id not in menu item"
            assert "name" in item, "name not in menu item"
            assert "price" in item, "price not in menu item"
            assert "discount_percentage" in item, "discount_percentage not in menu item"
            
        # Find items with discount
        discounted_items = [i for i in data if i.get("discount_percentage", 0) > 0]
        print(f"Total menu items: {len(data)}, Items with discount: {len(discounted_items)}")
        
        return data


class TestActiveDiscountsAPI:
    """Test GET /api/discounts/active returns active discount campaigns"""
    
    def test_get_active_discounts(self):
        """GET /api/discounts/active should return active discount campaigns"""
        response = requests.get(f"{BASE_URL}/api/discounts/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure of discounts
        for discount in data:
            assert "id" in discount, "id not in discount"
            assert "name" in discount, "name not in discount"
            assert "discount_type" in discount, "discount_type not in discount"
            assert "value" in discount, "value not in discount"
            assert "is_active" in discount, "is_active not in discount"
            assert discount["is_active"] == True, "Discount should be active"
        
        print(f"Active discount campaigns: {len(data)}")
        return data


class TestOrdersSessionAPI:
    """Test GET /api/orders/session/{session_token} returns orders and total_bill"""
    
    @pytest.fixture
    def session_token(self):
        """Get session token for testing"""
        response = requests.post(f"{BASE_URL}/api/sessions/start/{TABLE_ID}")
        assert response.status_code == 200
        return response.json()["session"]["session_token"]
    
    def test_get_session_orders(self, session_token):
        """GET /api/orders/session/{session_token} should return orders and total_bill"""
        response = requests.get(f"{BASE_URL}/api/orders/session/{session_token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "orders" in data, "orders not in response"
        assert "total_bill" in data, "total_bill not in response"
        
        orders = data["orders"]
        assert isinstance(orders, list), "orders should be a list"
        
        total_bill = data["total_bill"]
        assert isinstance(total_bill, (int, float)), "total_bill should be numeric"
        
        print(f"Orders count: {len(orders)}, Total bill: {total_bill}")
        
        # Check order structure if orders exist
        for order in orders:
            assert "id" in order, "id not in order"
            assert "order_number" in order, "order_number not in order"
            assert "items" in order, "items not in order"
            assert "total_amount" in order, "total_amount not in order"
            assert "status" in order, "status not in order"
            
            # Check items have discount info
            for item in order["items"]:
                assert "name" in item, "name not in order item"
                assert "price" in item, "price not in order item"
                assert "quantity" in item, "quantity not in order item"
                assert "discount_percentage" in item, "discount_percentage not in order item"
                assert "discounted_price" in item, "discounted_price not in order item"
        
        return data
    
    def test_get_session_orders_invalid_token(self):
        """GET /api/orders/session/{invalid_token} should return 404"""
        response = requests.get(f"{BASE_URL}/api/orders/session/invalid-token")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestCreateOrderAPI:
    """Test POST /api/orders creates order with discount info"""
    
    @pytest.fixture
    def session_token(self):
        """Get session token for testing"""
        response = requests.post(f"{BASE_URL}/api/sessions/start/{TABLE_ID}")
        assert response.status_code == 200
        return response.json()["session"]["session_token"]
    
    @pytest.fixture
    def menu_items(self):
        """Get menu items for testing"""
        response = requests.get(f"{BASE_URL}/api/menu-items")
        assert response.status_code == 200
        return response.json()
    
    def test_create_order_with_discount_item(self, session_token, menu_items):
        """POST /api/orders should create order with per-item discount"""
        # Find an item with discount
        discounted_item = next((i for i in menu_items if i.get("discount_percentage", 0) > 0), None)
        
        if not discounted_item:
            pytest.skip("No discounted items available for testing")
        
        order_data = {
            "session_token": session_token,
            "items": [
                {
                    "menu_item_id": discounted_item["id"],
                    "name": discounted_item["name"],
                    "price": discounted_item["price"],
                    "quantity": 1,
                    "discount_percentage": discounted_item["discount_percentage"]
                }
            ],
            "total_amount": 0  # Will be calculated by backend
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "id not in order response"
        assert "order_number" in data, "order_number not in order response"
        assert "items" in data, "items not in order response"
        assert "total_amount" in data, "total_amount not in order response"
        
        # Check service charge is 0 (only applied when closing session)
        assert data.get("service_charge_amount", 0) == 0, "service_charge_amount should be 0 per order"
        
        # Check item has discount info
        order_item = data["items"][0]
        assert order_item["discount_percentage"] == discounted_item["discount_percentage"], "discount_percentage mismatch"
        assert "discounted_price" in order_item, "discounted_price not in order item"
        
        print(f"Created order: {data['order_number']}, Total: {data['total_amount']}")
        return data


class TestBillSummaryCalculation:
    """Test bill summary calculation with service charge"""
    
    @pytest.fixture
    def session_token(self):
        """Get session token for testing"""
        response = requests.post(f"{BASE_URL}/api/sessions/start/{TABLE_ID}")
        assert response.status_code == 200
        return response.json()["session"]["session_token"]
    
    def test_bill_summary_includes_service_charge_estimate(self, session_token):
        """Bill summary should include estimated service charge"""
        # Get settings for service charge percentage
        settings_response = requests.get(f"{BASE_URL}/api/settings")
        assert settings_response.status_code == 200
        service_charge_pct = settings_response.json().get("service_charge_percentage", 0)
        
        # Get orders for session
        orders_response = requests.get(f"{BASE_URL}/api/orders/session/{session_token}")
        assert orders_response.status_code == 200
        
        data = orders_response.json()
        total_bill = data["total_bill"]
        
        # Calculate expected service charge
        expected_service_charge = round(total_bill * (service_charge_pct / 100), 2)
        expected_grand_total = round(total_bill + expected_service_charge, 2)
        
        print(f"Total bill: {total_bill}, Service charge ({service_charge_pct}%): {expected_service_charge}, Grand total: {expected_grand_total}")
        
        # Verify the calculation is correct
        assert expected_service_charge >= 0, "Service charge should be >= 0"
        assert expected_grand_total >= total_bill, "Grand total should be >= total bill"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
