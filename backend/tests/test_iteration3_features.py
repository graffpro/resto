"""
Test Iteration 3 Features:
- Owner login and dashboard
- Admin login and dashboard
- Restaurant CRUD (create, edit, delete, toggle status)
- Admin management with time periods
- Admin edit with password change and expiration extension
- Admin delete
- Venue/Table CRUD by Admin
- User management (edit/delete/toggle status)
- Order editing (PUT /api/orders/{id})
- Cascade delete (restaurants -> users, users -> staff)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://table-sync-pro.preview.emergentagent.com').rstrip('/')

class TestOwnerLogin:
    """Test owner login functionality"""
    
    def test_owner_login_success(self):
        """Owner login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "owner",
            "password": "owner123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "owner"
        assert data["user"]["username"] == "owner"
        print(f"✓ Owner login successful, role: {data['user']['role']}")
        return data["token"]

    def test_owner_login_invalid_credentials(self):
        """Owner login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "owner",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
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


class TestRestaurantCRUD:
    """Test Restaurant CRUD operations"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "owner",
            "password": "owner123"
        })
        return response.json()["token"]
    
    def test_get_restaurants(self, owner_token):
        """Get list of restaurants"""
        response = requests.get(
            f"{BASE_URL}/api/restaurants",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} restaurants")
        return data
    
    def test_create_restaurant(self, owner_token):
        """Create a new restaurant"""
        response = requests.post(
            f"{BASE_URL}/api/restaurants",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "name": "TEST_Restaurant_Iteration3",
                "address": "Test Address",
                "phone": "+994501234567",
                "tax_percentage": 18,
                "service_charge_percentage": 10
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_Restaurant_Iteration3"
        assert "id" in data
        print(f"✓ Created restaurant: {data['name']} with ID: {data['id']}")
        return data["id"]
    
    def test_update_restaurant(self, owner_token):
        """Update a restaurant"""
        # First create a restaurant
        create_response = requests.post(
            f"{BASE_URL}/api/restaurants",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"name": "TEST_Restaurant_ToUpdate", "address": "Old Address"}
        )
        restaurant_id = create_response.json()["id"]
        
        # Update it
        response = requests.put(
            f"{BASE_URL}/api/restaurants/{restaurant_id}",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"name": "TEST_Restaurant_Updated", "address": "New Address"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Restaurant_Updated"
        assert data["address"] == "New Address"
        print(f"✓ Updated restaurant: {data['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/restaurants/{restaurant_id}", headers={"Authorization": f"Bearer {owner_token}"})
        return restaurant_id
    
    def test_toggle_restaurant_status(self, owner_token):
        """Toggle restaurant status"""
        # First create a restaurant
        create_response = requests.post(
            f"{BASE_URL}/api/restaurants",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"name": "TEST_Restaurant_ToToggle"}
        )
        restaurant_id = create_response.json()["id"]
        
        # Toggle status
        response = requests.put(
            f"{BASE_URL}/api/restaurants/{restaurant_id}/toggle-status",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_active" in data
        print(f"✓ Toggled restaurant status to: {data['is_active']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/restaurants/{restaurant_id}", headers={"Authorization": f"Bearer {owner_token}"})
    
    def test_delete_restaurant_cascades_to_users(self, owner_token):
        """Delete restaurant and verify cascade to users"""
        # Create restaurant
        create_response = requests.post(
            f"{BASE_URL}/api/restaurants",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"name": "TEST_Restaurant_ToDelete"}
        )
        restaurant_id = create_response.json()["id"]
        
        # Create admin for this restaurant
        admin_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "username": "TEST_admin_cascade",
                "password": "test123",
                "full_name": "Test Admin Cascade",
                "role": "admin",
                "restaurant_id": restaurant_id
            }
        )
        admin_id = admin_response.json()["id"]
        
        # Delete restaurant
        delete_response = requests.delete(
            f"{BASE_URL}/api/restaurants/{restaurant_id}",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify admin was deleted (should get 404)
        get_admin_response = requests.get(
            f"{BASE_URL}/api/users/{admin_id}",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert get_admin_response.status_code == 404
        print("✓ Restaurant deletion cascaded to delete users")


class TestAdminManagement:
    """Test Admin management with time periods"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "owner",
            "password": "owner123"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def test_restaurant_id(self, owner_token):
        # Get existing restaurant or create one
        response = requests.get(
            f"{BASE_URL}/api/restaurants",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        restaurants = response.json()
        if restaurants:
            return restaurants[0]["id"]
        # Create one if none exists
        create_response = requests.post(
            f"{BASE_URL}/api/restaurants",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"name": "TEST_Restaurant_ForAdmin"}
        )
        return create_response.json()["id"]
    
    def test_create_admin_with_expiration(self, owner_token, test_restaurant_id):
        """Create admin with expiration date"""
        from datetime import datetime, timedelta
        expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "username": "TEST_admin_expiry",
                "password": "test123",
                "full_name": "Test Admin Expiry",
                "role": "admin",
                "restaurant_id": test_restaurant_id,
                "admin_pin": "1234",
                "expires_at": expires_at
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["expires_at"] == expires_at
        assert data["admin_pin"] == "1234"
        print(f"✓ Created admin with expiration: {expires_at}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{data['id']}", headers={"Authorization": f"Bearer {owner_token}"})
    
    def test_update_admin_password_and_expiration(self, owner_token, test_restaurant_id):
        """Update admin password and extend expiration"""
        from datetime import datetime, timedelta
        
        # Create admin
        create_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "username": "TEST_admin_update",
                "password": "oldpass123",
                "full_name": "Test Admin Update",
                "role": "admin",
                "restaurant_id": test_restaurant_id,
                "expires_at": (datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d')
            }
        )
        admin_id = create_response.json()["id"]
        
        # Update password and extend expiration
        new_expires = (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d')
        update_response = requests.put(
            f"{BASE_URL}/api/users/{admin_id}",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "full_name": "Test Admin Updated",
                "new_password": "newpass123",
                "expires_at": new_expires,
                "admin_pin": "5678"
            }
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["full_name"] == "Test Admin Updated"
        assert data["expires_at"] == new_expires
        assert data["admin_pin"] == "5678"
        print(f"✓ Updated admin password and extended expiration to: {new_expires}")
        
        # Verify new password works
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "TEST_admin_update",
            "password": "newpass123"
        })
        assert login_response.status_code == 200
        print("✓ New password works for login")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{admin_id}", headers={"Authorization": f"Bearer {owner_token}"})
    
    def test_delete_admin_cascades_to_staff(self, owner_token, test_restaurant_id):
        """Delete admin and verify cascade to staff"""
        # Create admin
        admin_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "username": "TEST_admin_cascade2",
                "password": "test123",
                "full_name": "Test Admin Cascade2",
                "role": "admin",
                "restaurant_id": test_restaurant_id
            }
        )
        admin_id = admin_response.json()["id"]
        
        # Login as admin to create staff
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "TEST_admin_cascade2",
            "password": "test123"
        })
        admin_token = admin_login.json()["token"]
        
        # Create staff (kitchen user)
        staff_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "TEST_kitchen_cascade",
                "password": "test123",
                "full_name": "Test Kitchen Cascade",
                "role": "kitchen"
            }
        )
        staff_id = staff_response.json()["id"]
        
        # Delete admin (should cascade to staff)
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/{admin_id}",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify staff was deleted
        get_staff_response = requests.get(
            f"{BASE_URL}/api/users/{staff_id}",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert get_staff_response.status_code == 404
        print("✓ Admin deletion cascaded to delete staff")


class TestVenueTableCRUD:
    """Test Venue and Table CRUD by Admin"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_create_venue(self, admin_token):
        """Create a venue"""
        response = requests.post(
            f"{BASE_URL}/api/venues",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "TEST_Venue_Iteration3", "description": "Test venue"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_Venue_Iteration3"
        print(f"✓ Created venue: {data['name']}")
        return data["id"]
    
    def test_update_venue(self, admin_token):
        """Update a venue"""
        # Create venue
        create_response = requests.post(
            f"{BASE_URL}/api/venues",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "TEST_Venue_ToUpdate"}
        )
        venue_id = create_response.json()["id"]
        
        # Update venue
        response = requests.put(
            f"{BASE_URL}/api/venues/{venue_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "TEST_Venue_Updated", "description": "Updated description"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Venue_Updated"
        print(f"✓ Updated venue: {data['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/venues/{venue_id}", headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_delete_venue(self, admin_token):
        """Delete a venue"""
        # Create venue
        create_response = requests.post(
            f"{BASE_URL}/api/venues",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "TEST_Venue_ToDelete"}
        )
        venue_id = create_response.json()["id"]
        
        # Delete venue
        response = requests.delete(
            f"{BASE_URL}/api/venues/{venue_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✓ Deleted venue")
    
    def test_create_table(self, admin_token):
        """Create a table"""
        # First get or create a venue
        venues_response = requests.get(f"{BASE_URL}/api/venues")
        venues = venues_response.json()
        if not venues:
            venue_response = requests.post(
                f"{BASE_URL}/api/venues",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"name": "TEST_Venue_ForTable"}
            )
            venue_id = venue_response.json()["id"]
        else:
            venue_id = venues[0]["id"]
        
        # Create table
        response = requests.post(
            f"{BASE_URL}/api/tables",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"table_number": "TEST99", "venue_id": venue_id}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["table_number"] == "TEST99"
        assert "qr_code" in data
        print(f"✓ Created table: #{data['table_number']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tables/{data['id']}", headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_update_table(self, admin_token):
        """Update a table"""
        # Get venue
        venues_response = requests.get(f"{BASE_URL}/api/venues")
        venues = venues_response.json()
        venue_id = venues[0]["id"] if venues else None
        
        if not venue_id:
            venue_response = requests.post(
                f"{BASE_URL}/api/venues",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"name": "TEST_Venue_ForTableUpdate"}
            )
            venue_id = venue_response.json()["id"]
        
        # Create table
        create_response = requests.post(
            f"{BASE_URL}/api/tables",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"table_number": "TEST88", "venue_id": venue_id}
        )
        table_id = create_response.json()["id"]
        
        # Update table
        response = requests.put(
            f"{BASE_URL}/api/tables/{table_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"table_number": "TEST88-UPDATED", "venue_id": venue_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["table_number"] == "TEST88-UPDATED"
        print(f"✓ Updated table: #{data['table_number']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tables/{table_id}", headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_delete_table(self, admin_token):
        """Delete a table"""
        # Get venue
        venues_response = requests.get(f"{BASE_URL}/api/venues")
        venues = venues_response.json()
        venue_id = venues[0]["id"] if venues else None
        
        if not venue_id:
            venue_response = requests.post(
                f"{BASE_URL}/api/venues",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"name": "TEST_Venue_ForTableDelete"}
            )
            venue_id = venue_response.json()["id"]
        
        # Create table
        create_response = requests.post(
            f"{BASE_URL}/api/tables",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"table_number": "TEST77", "venue_id": venue_id}
        )
        table_id = create_response.json()["id"]
        
        # Delete table
        response = requests.delete(
            f"{BASE_URL}/api/tables/{table_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✓ Deleted table")


class TestUserManagement:
    """Test User management (edit/delete/toggle status)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_get_users(self, admin_token):
        """Get list of users (staff)"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} users")
    
    def test_create_and_edit_user(self, admin_token):
        """Create and edit a user"""
        # Create user
        create_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "TEST_waiter_edit",
                "password": "test123",
                "full_name": "Test Waiter Edit",
                "role": "waiter"
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Edit user
        update_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"full_name": "Test Waiter Updated", "role": "kitchen"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["full_name"] == "Test Waiter Updated"
        assert data["role"] == "kitchen"
        print("✓ Created and edited user")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_toggle_user_status(self, admin_token):
        """Toggle user status"""
        # Create user
        create_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "TEST_waiter_toggle",
                "password": "test123",
                "full_name": "Test Waiter Toggle",
                "role": "waiter"
            }
        )
        user_id = create_response.json()["id"]
        
        # Toggle status
        toggle_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}/toggle-status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert toggle_response.status_code == 200
        data = toggle_response.json()
        assert "is_active" in data
        print(f"✓ Toggled user status to: {data['is_active']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_delete_user(self, admin_token):
        """Delete a user"""
        # Create user
        create_response = requests.post(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "TEST_waiter_delete",
                "password": "test123",
                "full_name": "Test Waiter Delete",
                "role": "waiter"
            }
        )
        user_id = create_response.json()["id"]
        
        # Delete user
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        print("✓ Deleted user")


class TestOrderEditing:
    """Test Order editing (PUT /api/orders/{id})"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_update_order_items(self, admin_token):
        """Update order items and total_amount"""
        # Get active sessions to find an order
        sessions_response = requests.get(
            f"{BASE_URL}/api/sessions/active",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        sessions = sessions_response.json()
        
        if not sessions:
            print("⚠ No active sessions to test order editing - skipping")
            return
        
        # Get session details to find orders
        session_id = sessions[0]["session"]["id"]
        details_response = requests.get(
            f"{BASE_URL}/api/sessions/{session_id}/details",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if details_response.status_code != 200:
            print("⚠ Could not get session details - skipping")
            return
        
        details = details_response.json()
        orders = details.get("orders", [])
        
        if not orders:
            print("⚠ No orders in session to test editing - skipping")
            return
        
        order = orders[0]
        order_id = order["id"]
        
        # Update order items
        new_items = [
            {"name": "Test Item", "price": 10.0, "quantity": 2, "menu_item_id": "test"}
        ]
        new_total = 20.0
        
        update_response = requests.put(
            f"{BASE_URL}/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"items": new_items, "total_amount": new_total}
        )
        assert update_response.status_code == 200
        print("✓ Updated order items and total_amount")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
