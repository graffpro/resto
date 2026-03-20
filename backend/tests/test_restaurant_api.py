"""
Restaurant QR Management System - Backend API Tests
Tests for: Auth, Expenses, Discounts, Reservations, Financial Analytics, Menus
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://table-order-system-16.preview.emergentagent.com')
API = f"{BASE_URL}/api"

# Test credentials
OWNER_CREDENTIALS = {"username": "owner", "password": "owner123"}


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_owner_success(self):
        """Test owner login with valid credentials"""
        response = requests.post(f"{API}/auth/login", json=OWNER_CREDENTIALS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "owner", f"Expected owner role, got {data['user']['role']}"
        assert data["user"]["username"] == "owner"
        print(f"✓ Owner login successful - User: {data['user']['full_name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{API}/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


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


class TestExpenses:
    """Expenses CRUD tests"""
    
    def test_get_expenses(self, auth_headers):
        """Test fetching expenses list"""
        response = requests.get(f"{API}/expenses", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get expenses: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of expenses"
        print(f"✓ Fetched {len(data)} expenses")
    
    def test_create_expense(self, auth_headers):
        """Test creating a new expense"""
        expense_data = {
            "name": "TEST_Electricity Bill",
            "amount": 150.50,
            "category": "Kommunal",
            "expense_type": "monthly",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Test expense for automation"
        }
        response = requests.post(f"{API}/expenses", json=expense_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        data = response.json()
        assert data["name"] == expense_data["name"]
        assert data["amount"] == expense_data["amount"]
        assert data["category"] == expense_data["category"]
        assert "id" in data
        print(f"✓ Created expense: {data['name']} - {data['amount']} AZN")
        return data["id"]
    
    def test_create_and_verify_expense(self, auth_headers):
        """Test creating expense and verifying it appears in list"""
        # Create expense
        expense_data = {
            "name": "TEST_Water Bill",
            "amount": 75.25,
            "category": "Kommunal",
            "expense_type": "monthly",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Test water expense"
        }
        create_response = requests.post(f"{API}/expenses", json=expense_data, headers=auth_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        expense_id = created["id"]
        
        # Verify in list
        list_response = requests.get(f"{API}/expenses", headers=auth_headers)
        assert list_response.status_code == 200
        expenses = list_response.json()
        found = any(e["id"] == expense_id for e in expenses)
        assert found, "Created expense not found in list"
        print(f"✓ Expense created and verified in list")
        
        # Cleanup
        requests.delete(f"{API}/expenses/{expense_id}", headers=auth_headers)


class TestDiscounts:
    """Discounts CRUD tests"""
    
    def test_get_discounts(self):
        """Test fetching discounts list (public endpoint)"""
        response = requests.get(f"{API}/discounts")
        assert response.status_code == 200, f"Failed to get discounts: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of discounts"
        print(f"✓ Fetched {len(data)} discounts")
    
    def test_get_active_discounts(self):
        """Test fetching active discounts"""
        response = requests.get(f"{API}/discounts/active")
        assert response.status_code == 200, f"Failed to get active discounts: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of active discounts"
        print(f"✓ Fetched {len(data)} active discounts")
    
    def test_create_discount(self, auth_headers):
        """Test creating a new discount"""
        discount_data = {
            "name": "TEST_New Year Discount",
            "description": "Special discount for testing",
            "discount_type": "percentage",
            "value": 15.0,
            "min_order_amount": 50.0,
            "valid_from": "2026-01-01",
            "valid_until": "2026-12-31"
        }
        response = requests.post(f"{API}/discounts", json=discount_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create discount: {response.text}"
        data = response.json()
        assert data["name"] == discount_data["name"]
        assert data["value"] == discount_data["value"]
        assert data["discount_type"] == "percentage"
        assert "id" in data
        print(f"✓ Created discount: {data['name']} - {data['value']}%")
        return data["id"]
    
    def test_create_and_verify_discount(self, auth_headers):
        """Test creating discount and verifying it appears in list"""
        # Create discount
        discount_data = {
            "name": "TEST_Summer Sale",
            "description": "Summer promotion",
            "discount_type": "fixed",
            "value": 10.0,
            "min_order_amount": 30.0
        }
        create_response = requests.post(f"{API}/discounts", json=discount_data, headers=auth_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        discount_id = created["id"]
        
        # Verify in list
        list_response = requests.get(f"{API}/discounts")
        assert list_response.status_code == 200
        discounts = list_response.json()
        found = any(d["id"] == discount_id for d in discounts)
        assert found, "Created discount not found in list"
        print(f"✓ Discount created and verified in list")
        
        # Cleanup
        requests.delete(f"{API}/discounts/{discount_id}", headers=auth_headers)
    
    def test_toggle_discount(self, auth_headers):
        """Test toggling discount active status"""
        # Create a discount first
        discount_data = {
            "name": "TEST_Toggle Discount",
            "discount_type": "percentage",
            "value": 5.0
        }
        create_response = requests.post(f"{API}/discounts", json=discount_data, headers=auth_headers)
        assert create_response.status_code == 200
        discount_id = create_response.json()["id"]
        
        # Toggle it
        toggle_response = requests.put(f"{API}/discounts/{discount_id}/toggle", headers=auth_headers)
        assert toggle_response.status_code == 200
        print(f"✓ Discount toggle successful")
        
        # Cleanup
        requests.delete(f"{API}/discounts/{discount_id}", headers=auth_headers)


class TestReservations:
    """Reservations CRUD tests"""
    
    def test_get_reservations(self, auth_headers):
        """Test fetching reservations list"""
        response = requests.get(f"{API}/reservations", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get reservations: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of reservations"
        print(f"✓ Fetched {len(data)} reservations")
    
    def test_create_reservation_requires_table(self, auth_headers):
        """Test creating reservation - need to get tables first"""
        # Get tables
        tables_response = requests.get(f"{API}/tables")
        assert tables_response.status_code == 200
        tables = tables_response.json()
        
        if len(tables) == 0:
            pytest.skip("No tables available for reservation test")
        
        table_id = tables[0]["id"]
        
        reservation_data = {
            "table_id": table_id,
            "customer_name": "TEST_Customer",
            "customer_phone": "+994 50 123 45 67",
            "customer_email": "test@example.com",
            "reservation_date": "2026-02-15",
            "reservation_time": "19:00",
            "guest_count": 4,
            "special_requests": "Birthday celebration"
        }
        
        # Note: Reservation creation is public (no auth required)
        response = requests.post(f"{API}/reservations", json=reservation_data)
        assert response.status_code == 200, f"Failed to create reservation: {response.text}"
        data = response.json()
        assert data["customer_name"] == reservation_data["customer_name"]
        assert data["guest_count"] == reservation_data["guest_count"]
        assert "id" in data
        print(f"✓ Created reservation for {data['customer_name']}")
        
        # Cleanup
        requests.delete(f"{API}/reservations/{data['id']}", headers=auth_headers)


class TestFinancialAnalytics:
    """Financial analytics endpoint tests"""
    
    def test_get_financial_analytics(self, auth_headers):
        """Test fetching financial analytics"""
        response = requests.get(f"{API}/analytics/financial", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get financial analytics: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "total_revenue" in data, "Missing total_revenue"
        assert "total_expenses" in data, "Missing total_expenses"
        assert "net_profit" in data, "Missing net_profit"
        assert "profit_margin" in data, "Missing profit_margin"
        assert "orders_count" in data, "Missing orders_count"
        assert "expenses_count" in data, "Missing expenses_count"
        assert "expense_by_category" in data, "Missing expense_by_category"
        
        print(f"✓ Financial Analytics: Revenue={data['total_revenue']}, Expenses={data['total_expenses']}, Profit={data['net_profit']}")
    
    def test_get_financial_analytics_with_date_range(self, auth_headers):
        """Test fetching financial analytics with date range"""
        params = {
            "start_date": "2026-01-01",
            "end_date": "2026-01-31"
        }
        response = requests.get(f"{API}/analytics/financial", params=params, headers=auth_headers)
        assert response.status_code == 200, f"Failed to get financial analytics with date range: {response.text}"
        print("✓ Financial analytics with date range works")


class TestMenus:
    """Menus CRUD tests"""
    
    def test_get_menus(self):
        """Test fetching menus list (public endpoint)"""
        response = requests.get(f"{API}/menus")
        assert response.status_code == 200, f"Failed to get menus: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of menus"
        print(f"✓ Fetched {len(data)} menus")
    
    def test_create_menu(self, auth_headers):
        """Test creating a new menu"""
        menu_data = {
            "name": "TEST_Breakfast Menu",
            "description": "Morning breakfast items",
            "display_order": 1
        }
        response = requests.post(f"{API}/menus", json=menu_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create menu: {response.text}"
        data = response.json()
        assert data["name"] == menu_data["name"]
        assert data["description"] == menu_data["description"]
        assert "id" in data
        print(f"✓ Created menu: {data['name']}")
        
        # Cleanup
        requests.delete(f"{API}/menus/{data['id']}", headers=auth_headers)
    
    def test_create_and_verify_menu(self, auth_headers):
        """Test creating menu and verifying it appears in list"""
        # Create menu
        menu_data = {
            "name": "TEST_Lunch Menu",
            "description": "Lunch specials",
            "display_order": 2
        }
        create_response = requests.post(f"{API}/menus", json=menu_data, headers=auth_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        menu_id = created["id"]
        
        # Verify in list
        list_response = requests.get(f"{API}/menus")
        assert list_response.status_code == 200
        menus = list_response.json()
        found = any(m["id"] == menu_id for m in menus)
        assert found, "Created menu not found in list"
        print(f"✓ Menu created and verified in list")
        
        # Cleanup
        requests.delete(f"{API}/menus/{menu_id}", headers=auth_headers)


class TestDetailedAnalytics:
    """Detailed analytics endpoint tests"""
    
    def test_get_detailed_analytics(self, auth_headers):
        """Test fetching detailed analytics"""
        response = requests.get(f"{API}/analytics/detailed", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get detailed analytics: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of analytics data"
        print(f"✓ Fetched {len(data)} detailed analytics records")
    
    def test_get_popular_items(self):
        """Test fetching popular items stats (public endpoint)"""
        response = requests.get(f"{API}/analytics/popular-items")
        assert response.status_code == 200, f"Failed to get popular items: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of popular items"
        print(f"✓ Fetched {len(data)} popular items")


class TestUsers:
    """Users endpoint tests"""
    
    def test_get_users(self, auth_headers):
        """Test fetching users list"""
        response = requests.get(f"{API}/users", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of users"
        assert len(data) > 0, "Expected at least one user (owner)"
        print(f"✓ Fetched {len(data)} users")


class TestVenuesAndTables:
    """Venues and Tables endpoint tests"""
    
    def test_get_venues(self):
        """Test fetching venues list"""
        response = requests.get(f"{API}/venues")
        assert response.status_code == 200, f"Failed to get venues: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of venues"
        print(f"✓ Fetched {len(data)} venues")
    
    def test_get_tables(self):
        """Test fetching tables list"""
        response = requests.get(f"{API}/tables")
        assert response.status_code == 200, f"Failed to get tables: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of tables"
        print(f"✓ Fetched {len(data)} tables")
    
    def test_get_available_tables(self):
        """Test fetching available tables for a date"""
        params = {"date": "2026-02-15", "time": "19:00"}
        response = requests.get(f"{API}/tables/available", params=params)
        assert response.status_code == 200, f"Failed to get available tables: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of available tables"
        print(f"✓ Fetched {len(data)} available tables")


class TestSettings:
    """Settings endpoint tests"""
    
    def test_get_settings(self):
        """Test fetching settings"""
        response = requests.get(f"{API}/settings")
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        assert "name" in data, "Missing restaurant name"
        assert "currency" in data, "Missing currency"
        print(f"✓ Settings: {data['name']} - Currency: {data['currency']}")


class TestActiveSessions:
    """Active sessions endpoint tests"""
    
    def test_get_active_sessions(self):
        """Test fetching active sessions"""
        response = requests.get(f"{API}/sessions/active")
        assert response.status_code == 200, f"Failed to get active sessions: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of active sessions"
        print(f"✓ Fetched {len(data)} active sessions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
