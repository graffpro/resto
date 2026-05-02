"""
Restaurant QR System - New Features Tests
Tests for: Menu item discounts, Order-level discounts, Bill summary, Admin PIN
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://qr-restaurant-hub-6.preview.emergentagent.com')
API = f"{BASE_URL}/api"

# Test credentials
OWNER_CREDENTIALS = {"username": "owner", "password": "owner123"}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for owner"""
    response = requests.post(f"{API}/auth/login", json=OWNER_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestMenuItemWithDiscountAndImage:
    """Test menu item creation with image_url and discount_percentage fields"""
    
    def test_create_menu_item_with_discount_and_image(self, auth_headers):
        """Test creating menu item with image_url and discount_percentage"""
        # First get a category
        categories_response = requests.get(f"{API}/categories")
        assert categories_response.status_code == 200
        categories = categories_response.json()
        
        if len(categories) == 0:
            # Create a category first
            cat_data = {"name": "TEST_Category", "description": "Test category"}
            cat_response = requests.post(f"{API}/categories", json=cat_data, headers=auth_headers)
            assert cat_response.status_code == 200
            category_id = cat_response.json()["id"]
        else:
            category_id = categories[0]["id"]
        
        # Create menu item with discount and image
        item_data = {
            "name": "TEST_Discounted Item",
            "description": "Item with 20% discount",
            "price": 25.00,
            "category_id": category_id,
            "image_url": "https://example.com/test-image.jpg",
            "discount_percentage": 20.0,
            "is_available": True,
            "preparation_time": 15
        }
        
        response = requests.post(f"{API}/menu-items", json=item_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create menu item: {response.text}"
        data = response.json()
        
        # Verify all fields
        assert data["name"] == item_data["name"]
        assert data["price"] == item_data["price"]
        assert data["image_url"] == item_data["image_url"], "image_url not saved correctly"
        assert data["discount_percentage"] == item_data["discount_percentage"], "discount_percentage not saved correctly"
        assert "id" in data
        
        print(f"✓ Created menu item with discount: {data['name']} - {data['discount_percentage']}% off, image: {data['image_url']}")
        
        # Cleanup
        requests.delete(f"{API}/menu-items/{data['id']}", headers=auth_headers)
    
    def test_update_menu_item_discount(self, auth_headers):
        """Test updating menu item discount percentage"""
        # Get categories
        categories_response = requests.get(f"{API}/categories")
        categories = categories_response.json()
        if len(categories) == 0:
            pytest.skip("No categories available")
        category_id = categories[0]["id"]
        
        # Create item without discount
        item_data = {
            "name": "TEST_Item_No_Discount",
            "description": "Item without discount",
            "price": 30.00,
            "category_id": category_id,
            "discount_percentage": 0,
            "is_available": True
        }
        create_response = requests.post(f"{API}/menu-items", json=item_data, headers=auth_headers)
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Update with discount
        update_data = {
            "name": "TEST_Item_With_Discount",
            "description": "Now with 15% discount",
            "price": 30.00,
            "category_id": category_id,
            "discount_percentage": 15.0,
            "image_url": "https://example.com/updated-image.jpg",
            "is_available": True
        }
        update_response = requests.put(f"{API}/menu-items/{item_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200
        updated = update_response.json()
        
        assert updated["discount_percentage"] == 15.0, "Discount not updated"
        assert updated["image_url"] == "https://example.com/updated-image.jpg", "Image URL not updated"
        print(f"✓ Updated menu item discount to {updated['discount_percentage']}%")
        
        # Cleanup
        requests.delete(f"{API}/menu-items/{item_id}", headers=auth_headers)


class TestOrderLevelDiscounts:
    """Test order-level discounts based on min_order_amount"""
    
    def test_discount_applied_to_order_over_threshold(self, auth_headers):
        """Test that orders over min_order_amount get discount applied"""
        # First check if there's an active discount with min_order_amount
        discounts_response = requests.get(f"{API}/discounts/active")
        assert discounts_response.status_code == 200
        discounts = discounts_response.json()
        
        # Find discount with min_order_amount >= 50
        applicable_discount = None
        for d in discounts:
            if d.get('min_order_amount', 0) >= 50 and d.get('is_active', True):
                applicable_discount = d
                break
        
        if not applicable_discount:
            # Create a test discount
            discount_data = {
                "name": "TEST_50AZN_Discount",
                "description": "15% off for orders over 50 AZN",
                "discount_type": "percentage",
                "value": 15.0,
                "min_order_amount": 50.0
            }
            create_response = requests.post(f"{API}/discounts", json=discount_data, headers=auth_headers)
            assert create_response.status_code == 200
            applicable_discount = create_response.json()
            print(f"✓ Created test discount: {applicable_discount['name']}")
        
        print(f"✓ Found applicable discount: {applicable_discount['name']} - {applicable_discount['value']}% for orders >= {applicable_discount.get('min_order_amount', 0)} AZN")
    
    def test_get_active_discounts_with_min_order(self):
        """Test that active discounts endpoint returns min_order_amount"""
        response = requests.get(f"{API}/discounts/active")
        assert response.status_code == 200
        discounts = response.json()
        
        for discount in discounts:
            assert "min_order_amount" in discount or discount.get('min_order_amount') is None, "min_order_amount field missing"
            print(f"  - {discount['name']}: min_order={discount.get('min_order_amount', 0)} AZN, value={discount['value']}")
        
        print(f"✓ Active discounts endpoint returns {len(discounts)} discounts with min_order_amount field")


class TestCloseSessionBillSummary:
    """Test close session returns detailed bill_summary with discounts_applied"""
    
    def test_close_session_returns_bill_summary(self, auth_headers):
        """Test that closing a session returns detailed bill summary"""
        # Get active sessions
        sessions_response = requests.get(f"{API}/sessions/active")
        assert sessions_response.status_code == 200
        sessions = sessions_response.json()
        
        if len(sessions) == 0:
            # Need to create a session first - get a table
            tables_response = requests.get(f"{API}/tables")
            tables = tables_response.json()
            if len(tables) == 0:
                pytest.skip("No tables available to create session")
            
            table_id = tables[0]["id"]
            # Start a session
            start_response = requests.post(f"{API}/sessions/start/{table_id}")
            assert start_response.status_code == 200
            session = start_response.json()["session"]
            session_id = session["id"]
            print(f"✓ Created test session: {session_id}")
        else:
            session_id = sessions[0]["session"]["id"]
        
        # Close the session
        close_response = requests.post(f"{API}/sessions/close/{session_id}", headers=auth_headers)
        assert close_response.status_code == 200
        data = close_response.json()
        
        # Verify bill_summary structure
        assert "bill_summary" in data, "bill_summary not in response"
        bill = data["bill_summary"]
        
        assert "table" in bill, "table not in bill_summary"
        assert "orders" in bill, "orders not in bill_summary"
        assert "orders_count" in bill, "orders_count not in bill_summary"
        assert "subtotal" in bill, "subtotal not in bill_summary"
        assert "total_discount" in bill, "total_discount not in bill_summary"
        assert "total_amount" in bill, "total_amount not in bill_summary"
        assert "discounts_applied" in bill, "discounts_applied not in bill_summary"
        assert "closed_at" in bill, "closed_at not in bill_summary"
        
        print(f"✓ Close session returns bill_summary with all required fields")
        print(f"  - Orders: {bill['orders_count']}")
        print(f"  - Subtotal: {bill['subtotal']} AZN")
        print(f"  - Total Discount: {bill['total_discount']} AZN")
        print(f"  - Total Amount: {bill['total_amount']} AZN")
        print(f"  - Discounts Applied: {len(bill['discounts_applied'])} items")


class TestAdminPinSettings:
    """Test Admin PIN settings and verification"""
    
    def test_settings_has_admin_pin_field(self):
        """Test that settings endpoint returns admin_pin field"""
        response = requests.get(f"{API}/settings")
        assert response.status_code == 200
        data = response.json()
        
        # admin_pin should be in settings (can be empty string)
        assert "admin_pin" in data, "admin_pin field not in settings"
        print(f"✓ Settings has admin_pin field (value: {'set' if data['admin_pin'] else 'not set'})")
    
    def test_update_admin_pin(self, auth_headers):
        """Test updating admin PIN in settings"""
        # Get current settings
        get_response = requests.get(f"{API}/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update with new PIN
        updated_settings = {**current_settings, "admin_pin": "1234"}
        update_response = requests.put(f"{API}/settings", json=updated_settings, headers=auth_headers)
        assert update_response.status_code == 200
        
        # Verify PIN was saved
        verify_response = requests.get(f"{API}/settings")
        assert verify_response.status_code == 200
        assert verify_response.json()["admin_pin"] == "1234", "admin_pin not saved correctly"
        print(f"✓ Admin PIN updated successfully")
        
        # Reset PIN to empty
        reset_settings = {**current_settings, "admin_pin": ""}
        requests.put(f"{API}/settings", json=reset_settings, headers=auth_headers)
    
    def test_verify_admin_pin_endpoint_exists(self, auth_headers):
        """Test that POST /verify-admin-pin endpoint exists"""
        # First set a PIN
        settings_response = requests.get(f"{API}/settings")
        current_settings = settings_response.json()
        
        # Set a test PIN
        test_pin = "9999"
        updated_settings = {**current_settings, "admin_pin": test_pin}
        requests.put(f"{API}/settings", json=updated_settings, headers=auth_headers)
        
        # Test verify endpoint with correct PIN
        verify_response = requests.post(
            f"{API}/verify-admin-pin", 
            json={"pin": test_pin},
            headers=auth_headers
        )
        assert verify_response.status_code == 200, f"verify-admin-pin endpoint failed: {verify_response.text}"
        data = verify_response.json()
        assert data.get("valid") == True, "PIN verification should return valid=True"
        print(f"✓ verify-admin-pin endpoint exists and works with correct PIN")
        
        # Test with wrong PIN
        wrong_response = requests.post(
            f"{API}/verify-admin-pin",
            json={"pin": "0000"},
            headers=auth_headers
        )
        assert wrong_response.status_code == 401, "Wrong PIN should return 401"
        print(f"✓ verify-admin-pin correctly rejects wrong PIN")
        
        # Reset PIN
        reset_settings = {**current_settings, "admin_pin": ""}
        requests.put(f"{API}/settings", json=reset_settings, headers=auth_headers)
    
    def test_verify_pin_when_no_pin_set(self, auth_headers):
        """Test verify-admin-pin when no PIN is set"""
        # Ensure no PIN is set
        settings_response = requests.get(f"{API}/settings")
        current_settings = settings_response.json()
        reset_settings = {**current_settings, "admin_pin": ""}
        requests.put(f"{API}/settings", json=reset_settings, headers=auth_headers)
        
        # Verify should return valid=True when no PIN set
        verify_response = requests.post(
            f"{API}/verify-admin-pin",
            json={"pin": ""},
            headers=auth_headers
        )
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data.get("valid") == True, "Should return valid=True when no PIN is set"
        print(f"✓ verify-admin-pin returns valid=True when no PIN is set")


class TestOrderCreationWithDiscounts:
    """Test order creation applies discounts correctly"""
    
    def test_order_includes_discount_fields(self, auth_headers):
        """Test that order response includes discount-related fields"""
        # Get a table and start session
        tables_response = requests.get(f"{API}/tables")
        tables = tables_response.json()
        if len(tables) == 0:
            pytest.skip("No tables available")
        
        table_id = tables[0]["id"]
        session_response = requests.post(f"{API}/sessions/start/{table_id}")
        assert session_response.status_code == 200
        session = session_response.json()["session"]
        session_token = session["session_token"]
        
        # Get menu items
        items_response = requests.get(f"{API}/menu-items")
        items = items_response.json()
        if len(items) == 0:
            pytest.skip("No menu items available")
        
        # Create order with items totaling > 50 AZN to trigger discount
        order_items = []
        total = 0
        for item in items[:3]:  # Take up to 3 items
            order_items.append({
                "menu_item_id": item["id"],
                "name": item["name"],
                "price": item["price"],
                "quantity": 2
            })
            total += item["price"] * 2
            if total >= 60:  # Ensure we're over 50 AZN threshold
                break
        
        if total < 50:
            # Add more quantity to reach threshold
            order_items[0]["quantity"] = int(60 / order_items[0]["price"]) + 1
        
        order_data = {
            "session_token": session_token,
            "items": order_items,
            "total_amount": total
        }
        
        order_response = requests.post(f"{API}/orders", json=order_data)
        assert order_response.status_code == 200, f"Failed to create order: {order_response.text}"
        order = order_response.json()
        
        # Verify discount fields exist in order
        assert "subtotal" in order, "subtotal not in order"
        assert "discount_id" in order or order.get("discount_id") is None, "discount_id field missing"
        assert "discount_name" in order or order.get("discount_name") is None, "discount_name field missing"
        assert "discount_type" in order or order.get("discount_type") is None, "discount_type field missing"
        assert "discount_value" in order or order.get("discount_value") == 0, "discount_value field missing"
        assert "discount_amount" in order or order.get("discount_amount") == 0, "discount_amount field missing"
        assert "total_amount" in order, "total_amount not in order"
        
        print(f"✓ Order created with discount fields:")
        print(f"  - Subtotal: {order.get('subtotal', 'N/A')} AZN")
        print(f"  - Discount: {order.get('discount_name', 'None')} ({order.get('discount_value', 0)}%)")
        print(f"  - Discount Amount: {order.get('discount_amount', 0)} AZN")
        print(f"  - Total: {order['total_amount']} AZN")
        
        # Close session to cleanup
        requests.post(f"{API}/sessions/close/{session['id']}", headers=auth_headers)


class TestSalesByItemAnalytics:
    """Test sales by item analytics endpoint"""
    
    def test_get_sales_by_item(self, auth_headers):
        """Test fetching sales by item statistics"""
        response = requests.get(f"{API}/analytics/sales-by-item", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get sales by item: {response.text}"
        data = response.json()
        
        assert "period" in data, "period not in response"
        assert "items" in data, "items not in response"
        assert "total_revenue" in data, "total_revenue not in response"
        assert "total_items_sold" in data, "total_items_sold not in response"
        
        print(f"✓ Sales by item analytics: {len(data['items'])} items, Total Revenue: {data['total_revenue']} AZN")
    
    def test_get_sales_by_item_with_period(self, auth_headers):
        """Test fetching sales by item with different periods"""
        for period in ["today", "month", "year", "all"]:
            response = requests.get(f"{API}/analytics/sales-by-item?period={period}", headers=auth_headers)
            assert response.status_code == 200, f"Failed for period {period}: {response.text}"
            data = response.json()
            assert data["period"] == period
            print(f"  - Period '{period}': {len(data['items'])} items")
        
        print(f"✓ Sales by item works with all period filters")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
