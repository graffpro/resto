"""
Test Iteration 4 Features:
- Staff Management with points system
- Shift tracking (work/rest/absent/late)
- Points history tracking per staff member
- Inventory tracking with ingredient CRUD
- Stock transactions (purchase/usage)
- Low stock alerts
- Staff performance analytics with period filters
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://qr-order-platform-5.preview.emergentagent.com').rstrip('/')


class TestAdminAuth:
    """Test admin authentication for protected endpoints"""
    
    def test_admin_login(self):
        """Admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["username"] == "admin1"
        print(f"✓ Admin login successful, role: {data['user']['role']}")
        return data["token"]


# ==================== SHIFT LOGS TESTS ====================
class TestShiftLogs:
    """Test Shift log CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def waiter_id(self, admin_token):
        """Get or create a waiter for testing"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = response.json()
        waiters = [u for u in users if u.get('role') == 'waiter']
        if waiters:
            return waiters[0]['id']
        # Create a test waiter
        create_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "TEST_waiter_shift",
                "password": "test123",
                "full_name": "Test Waiter Shift",
                "role": "waiter"
            }
        )
        return create_response.json()["id"]
    
    def test_create_shift_work(self, admin_token, waiter_id):
        """POST /api/shifts - Create work shift"""
        today = datetime.now().strftime('%Y-%m-%d')
        response = requests.post(
            f"{BASE_URL}/api/shifts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": waiter_id,
                "date": today,
                "shift_type": "work",
                "start_time": "09:00",
                "end_time": "18:00",
                "notes": "Test work shift"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["shift_type"] == "work"
        assert data["user_id"] == waiter_id
        assert "id" in data
        print(f"✓ Created work shift for user {waiter_id}")
        return data["id"]
    
    def test_create_shift_rest(self, admin_token, waiter_id):
        """POST /api/shifts - Create rest shift"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        response = requests.post(
            f"{BASE_URL}/api/shifts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": waiter_id,
                "date": yesterday,
                "shift_type": "rest",
                "notes": "Day off"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["shift_type"] == "rest"
        print(f"✓ Created rest shift")
        return data["id"]
    
    def test_create_shift_absent(self, admin_token, waiter_id):
        """POST /api/shifts - Create absent shift"""
        two_days_ago = (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
        response = requests.post(
            f"{BASE_URL}/api/shifts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": waiter_id,
                "date": two_days_ago,
                "shift_type": "absent",
                "notes": "Did not show up"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["shift_type"] == "absent"
        print(f"✓ Created absent shift")
        return data["id"]
    
    def test_create_shift_late(self, admin_token, waiter_id):
        """POST /api/shifts - Create late shift"""
        three_days_ago = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')
        response = requests.post(
            f"{BASE_URL}/api/shifts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": waiter_id,
                "date": three_days_ago,
                "shift_type": "late",
                "start_time": "10:30",
                "end_time": "18:00",
                "notes": "Arrived 1.5 hours late"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["shift_type"] == "late"
        print(f"✓ Created late shift")
        return data["id"]
    
    def test_get_shifts(self, admin_token):
        """GET /api/shifts - Get all shift logs"""
        response = requests.get(
            f"{BASE_URL}/api/shifts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} shift logs")
        return data
    
    def test_get_shifts_with_filters(self, admin_token, waiter_id):
        """GET /api/shifts - Get shifts with date filters"""
        date_from = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        date_to = datetime.now().strftime('%Y-%m-%d')
        response = requests.get(
            f"{BASE_URL}/api/shifts?user_id={waiter_id}&date_from={date_from}&date_to={date_to}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} filtered shift logs")
    
    def test_delete_shift(self, admin_token, waiter_id):
        """DELETE /api/shifts/{id} - Delete shift log"""
        # Create a shift to delete
        response = requests.post(
            f"{BASE_URL}/api/shifts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": waiter_id,
                "date": (datetime.now() - timedelta(days=10)).strftime('%Y-%m-%d'),
                "shift_type": "work"
            }
        )
        shift_id = response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/shifts/{shift_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted shift log {shift_id}")


# ==================== POINTS HISTORY TESTS ====================
class TestPointsHistory:
    """Test Points history tracking"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def waiter_id(self, admin_token):
        """Get or create a waiter for testing"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = response.json()
        waiters = [u for u in users if u.get('role') == 'waiter']
        if waiters:
            return waiters[0]['id']
        # Create a test waiter
        create_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "TEST_waiter_points",
                "password": "test123",
                "full_name": "Test Waiter Points",
                "role": "waiter"
            }
        )
        return create_response.json()["id"]
    
    def test_add_points_positive(self, admin_token, waiter_id):
        """POST /api/points - Add positive points with history"""
        response = requests.post(
            f"{BASE_URL}/api/points",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": waiter_id,
                "points": 5,
                "reason": "Excellent customer service"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["points"] == 5
        assert data["reason"] == "Excellent customer service"
        assert "new_total" in data
        assert "id" in data
        print(f"✓ Added +5 points, new total: {data['new_total']}")
        return data
    
    def test_add_points_negative(self, admin_token, waiter_id):
        """POST /api/points - Deduct points with history"""
        response = requests.post(
            f"{BASE_URL}/api/points",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": waiter_id,
                "points": -3,
                "reason": "Late arrival"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["points"] == -3
        assert data["reason"] == "Late arrival"
        print(f"✓ Deducted -3 points, new total: {data['new_total']}")
    
    def test_get_points_history(self, admin_token, waiter_id):
        """GET /api/points/{user_id} - Get points history"""
        response = requests.get(
            f"{BASE_URL}/api/points/{waiter_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} points history entries")
        # Verify history entries have required fields
        if data:
            entry = data[0]
            assert "points" in entry
            assert "reason" in entry
            assert "created_at" in entry
            assert "new_total" in entry
        return data


# ==================== INVENTORY TESTS ====================
class TestIngredients:
    """Test Ingredient CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_create_ingredient(self, admin_token):
        """POST /api/ingredients - Create ingredient"""
        response = requests.post(
            f"{BASE_URL}/api/ingredients",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Tomato",
                "unit": "kq",
                "current_stock": 50,
                "min_stock": 10,
                "cost_per_unit": 2.5
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_Tomato"
        assert data["unit"] == "kq"
        assert data["current_stock"] == 50
        assert data["min_stock"] == 10
        assert "id" in data
        print(f"✓ Created ingredient: {data['name']}")
        return data["id"]
    
    def test_get_ingredients(self, admin_token):
        """GET /api/ingredients - Get all ingredients"""
        response = requests.get(
            f"{BASE_URL}/api/ingredients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} ingredients")
        return data
    
    def test_update_ingredient(self, admin_token):
        """PUT /api/ingredients/{id} - Update ingredient"""
        # Create ingredient first
        create_response = requests.post(
            f"{BASE_URL}/api/ingredients",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Onion",
                "unit": "kq",
                "current_stock": 30,
                "min_stock": 5,
                "cost_per_unit": 1.5
            }
        )
        ingredient_id = create_response.json()["id"]
        
        # Update it
        response = requests.put(
            f"{BASE_URL}/api/ingredients/{ingredient_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Onion_Updated",
                "unit": "kq",
                "current_stock": 40,
                "min_stock": 8,
                "cost_per_unit": 1.8
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Onion_Updated"
        assert data["current_stock"] == 40
        print(f"✓ Updated ingredient: {data['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ingredients/{ingredient_id}", headers={"Authorization": f"Bearer {admin_token}"})
        return ingredient_id
    
    def test_delete_ingredient(self, admin_token):
        """DELETE /api/ingredients/{id} - Delete ingredient"""
        # Create ingredient first
        create_response = requests.post(
            f"{BASE_URL}/api/ingredients",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Garlic",
                "unit": "ədəd",
                "current_stock": 100,
                "min_stock": 20,
                "cost_per_unit": 0.5
            }
        )
        ingredient_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/ingredients/{ingredient_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print(f"✓ Deleted ingredient")
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/ingredients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        ingredients = get_response.json()
        assert not any(i["id"] == ingredient_id for i in ingredients)


# ==================== STOCK TRANSACTIONS TESTS ====================
class TestStockTransactions:
    """Test Stock transaction operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def test_ingredient(self, admin_token):
        """Create a test ingredient for transactions"""
        response = requests.post(
            f"{BASE_URL}/api/ingredients",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Flour_TX",
                "unit": "kq",
                "current_stock": 100,
                "min_stock": 20,
                "cost_per_unit": 3.0
            }
        )
        return response.json()
    
    def test_purchase_transaction_increases_stock(self, admin_token, test_ingredient):
        """POST /api/stock-transactions - Purchase increases stock"""
        initial_stock = test_ingredient["current_stock"]
        
        response = requests.post(
            f"{BASE_URL}/api/stock-transactions",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "ingredient_id": test_ingredient["id"],
                "transaction_type": "purchase",
                "quantity": 50,
                "unit_cost": 3.0,
                "notes": "Weekly purchase",
                "date": datetime.now().strftime('%Y-%m-%d')
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["transaction_type"] == "purchase"
        assert data["quantity"] == 50
        assert data["stock_after"] == initial_stock + 50
        assert data["total_cost"] == 150.0  # 50 * 3.0
        print(f"✓ Purchase transaction: +50, stock now: {data['stock_after']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ingredients/{test_ingredient['id']}", headers={"Authorization": f"Bearer {admin_token}"})
        return data
    
    def test_usage_transaction_decreases_stock(self, admin_token, test_ingredient):
        """POST /api/stock-transactions - Usage decreases stock"""
        initial_stock = test_ingredient["current_stock"]
        
        response = requests.post(
            f"{BASE_URL}/api/stock-transactions",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "ingredient_id": test_ingredient["id"],
                "transaction_type": "usage",
                "quantity": 20,
                "notes": "Used for cooking",
                "date": datetime.now().strftime('%Y-%m-%d')
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["transaction_type"] == "usage"
        assert data["quantity"] == 20
        assert data["stock_after"] == initial_stock - 20
        print(f"✓ Usage transaction: -20, stock now: {data['stock_after']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ingredients/{test_ingredient['id']}", headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_get_stock_transactions(self, admin_token, test_ingredient):
        """GET /api/stock-transactions - Get transaction history"""
        # Create a transaction first
        requests.post(
            f"{BASE_URL}/api/stock-transactions",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "ingredient_id": test_ingredient["id"],
                "transaction_type": "purchase",
                "quantity": 10,
                "unit_cost": 3.0
            }
        )
        
        response = requests.get(
            f"{BASE_URL}/api/stock-transactions?ingredient_id={test_ingredient['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ Got {len(data)} transactions for ingredient")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ingredients/{test_ingredient['id']}", headers={"Authorization": f"Bearer {admin_token}"})


# ==================== INVENTORY SUMMARY TESTS ====================
class TestInventorySummary:
    """Test Inventory summary endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_get_inventory_summary(self, admin_token):
        """GET /api/inventory/summary - Get stock summary"""
        response = requests.get(
            f"{BASE_URL}/api/inventory/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got inventory summary with {len(data)} items")
        
        # Verify summary structure
        if data:
            item = data[0]
            assert "id" in item
            assert "name" in item
            assert "unit" in item
            assert "current_stock" in item
            assert "min_stock" in item
            assert "total_purchased" in item
            assert "total_used" in item
            assert "total_cost" in item
            assert "is_low_stock" in item
            print(f"✓ Summary item structure verified")
        return data
    
    def test_low_stock_alert(self, admin_token):
        """Verify low stock alert when current_stock <= min_stock"""
        # Create ingredient with low stock
        create_response = requests.post(
            f"{BASE_URL}/api/ingredients",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_LowStock_Item",
                "unit": "ədəd",
                "current_stock": 5,
                "min_stock": 10,  # current < min = low stock
                "cost_per_unit": 1.0
            }
        )
        ingredient_id = create_response.json()["id"]
        
        # Get summary and check low stock flag
        response = requests.get(
            f"{BASE_URL}/api/inventory/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        low_stock_item = next((i for i in data if i["id"] == ingredient_id), None)
        assert low_stock_item is not None
        assert low_stock_item["is_low_stock"] == True
        print(f"✓ Low stock alert working: {low_stock_item['name']} (stock: {low_stock_item['current_stock']}, min: {low_stock_item['min_stock']})")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ingredients/{ingredient_id}", headers={"Authorization": f"Bearer {admin_token}"})


# ==================== STAFF PERFORMANCE TESTS ====================
class TestStaffPerformance:
    """Test Staff performance analytics"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_get_staff_performance_default(self, admin_token):
        """GET /api/analytics/staff-performance - Default period (month)"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/staff-performance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got staff performance for {len(data)} waiters (default period)")
        
        # Verify structure
        if data:
            waiter = data[0]
            assert "id" in waiter
            assert "name" in waiter
            assert "points" in waiter
            assert "delivered_orders" in waiter
            assert "avg_delivery_time" in waiter
            assert "rest_days" in waiter
            assert "is_active" in waiter
            print(f"✓ Performance data structure verified")
        return data
    
    def test_get_staff_performance_today(self, admin_token):
        """GET /api/analytics/staff-performance?period=today"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/staff-performance?period=today",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got staff performance for today: {len(data)} waiters")
    
    def test_get_staff_performance_week(self, admin_token):
        """GET /api/analytics/staff-performance?period=week"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/staff-performance?period=week",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got staff performance for week: {len(data)} waiters")
    
    def test_get_staff_performance_year(self, admin_token):
        """GET /api/analytics/staff-performance?period=year"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/staff-performance?period=year",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got staff performance for year: {len(data)} waiters")


# ==================== PIN VERIFICATION TESTS ====================
class TestPinVerification:
    """Test Admin PIN verification"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_verify_admin_pin_correct(self, admin_token):
        """POST /api/verify-admin-pin - Correct PIN (admin1 PIN: 1234)"""
        response = requests.post(
            f"{BASE_URL}/api/verify-admin-pin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"pin": "1234"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["valid"] == True
        print(f"✓ PIN verification successful")
    
    def test_verify_admin_pin_incorrect(self, admin_token):
        """POST /api/verify-admin-pin - Incorrect PIN"""
        response = requests.post(
            f"{BASE_URL}/api/verify-admin-pin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"pin": "9999"}
        )
        assert response.status_code == 401
        print(f"✓ Incorrect PIN correctly rejected")


# ==================== CLEANUP ====================
class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_cleanup_test_ingredients(self, admin_token):
        """Remove TEST_ prefixed ingredients"""
        response = requests.get(
            f"{BASE_URL}/api/ingredients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        ingredients = response.json()
        test_ingredients = [i for i in ingredients if i["name"].startswith("TEST_")]
        
        for ing in test_ingredients:
            requests.delete(
                f"{BASE_URL}/api/ingredients/{ing['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        print(f"✓ Cleaned up {len(test_ingredients)} test ingredients")
    
    def test_cleanup_test_users(self, admin_token):
        """Remove TEST_ prefixed users"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = response.json()
        test_users = [u for u in users if u.get("username", "").startswith("TEST_")]
        
        for user in test_users:
            requests.delete(
                f"{BASE_URL}/api/users/{user['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        print(f"✓ Cleaned up {len(test_users)} test users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
