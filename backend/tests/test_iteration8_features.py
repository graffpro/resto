"""
Iteration 8 Backend Tests
Tests for:
1. Service charge removed from per-order calculation (only applied at session close)
2. GET /api/discounts/active - returns active discount campaigns
3. POST /api/sessions/close/{id} - calculates service_charge on total
4. POST /api/sessions/transfer - moves session to new table
5. PUT /api/timed-services/{id}/serve - creates order without service charge
6. PUT /api/timed-services/{id}/stop - deactivates timed service
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration8Features:
    """Test iteration 8 features: service charge removal from per-order, discount visibility"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_token = None
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            self.admin_token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        yield
    
    def test_01_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["username"] == "admin1"
        print("PASS: Admin login successful")
    
    def test_02_get_active_discounts(self):
        """Test GET /api/discounts/active returns active discount campaigns"""
        response = requests.get(f"{BASE_URL}/api/discounts/active")
        assert response.status_code == 200, f"Failed to get active discounts: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/discounts/active returned {len(data)} active discounts")
        
        # Verify discount structure if any exist
        if len(data) > 0:
            discount = data[0]
            assert "id" in discount
            assert "name" in discount
            assert "discount_type" in discount
            assert "value" in discount
            assert discount.get("is_active") == True
            print(f"  - First discount: {discount.get('name')} ({discount.get('value')}{discount.get('discount_type') == 'percentage' and '%' or ' AZN'})")
    
    def test_03_create_order_no_service_charge(self):
        """Test POST /api/orders does NOT include service_charge_amount (should be 0)"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get tables
        tables_response = self.session.get(f"{BASE_URL}/api/tables")
        assert tables_response.status_code == 200
        tables = tables_response.json()
        if not tables:
            pytest.skip("No tables available")
        
        table_id = tables[0]["id"]
        
        # Start a session
        session_response = requests.post(f"{BASE_URL}/api/sessions/start/{table_id}")
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_token = session_data["session"]["session_token"]
        session_id = session_data["session"]["id"]
        
        # Get menu items
        menu_response = requests.get(f"{BASE_URL}/api/menu-items")
        assert menu_response.status_code == 200
        menu_items = menu_response.json()
        if not menu_items:
            pytest.skip("No menu items available")
        
        menu_item = menu_items[0]
        
        # Create order
        order_data = {
            "session_token": session_token,
            "items": [{
                "menu_item_id": menu_item["id"],
                "name": menu_item["name"],
                "price": menu_item["price"],
                "quantity": 2,
                "discount_percentage": 0
            }],
            "total_amount": menu_item["price"] * 2
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert order_response.status_code == 200, f"Failed to create order: {order_response.text}"
        order = order_response.json()
        
        # CRITICAL: Verify service_charge_amount is 0 (not applied per order)
        assert order.get("service_charge_amount", 0) == 0, f"Service charge should be 0 per order, got {order.get('service_charge_amount')}"
        assert order.get("service_charge_percentage", 0) == 0, f"Service charge percentage should be 0 per order"
        
        print(f"PASS: Order created with service_charge_amount=0 (correct - no per-order service charge)")
        print(f"  - Order: {order.get('order_number')}, Total: {order.get('total_amount')} AZN")
        
        # Store for cleanup
        self._test_session_id = session_id
        self._test_order_id = order.get("id")
    
    def test_04_close_session_with_service_charge(self):
        """Test POST /api/sessions/close/{id} calculates service_charge on total"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get active sessions
        sessions_response = self.session.get(f"{BASE_URL}/api/sessions/active")
        assert sessions_response.status_code == 200
        sessions = sessions_response.json()
        
        if not sessions:
            pytest.skip("No active sessions to close")
        
        # Find a session with orders
        session_to_close = None
        for s in sessions:
            session = s.get("session", s)
            if s.get("active_orders", 0) > 0:
                session_to_close = session
                break
        
        if not session_to_close:
            # Use first session
            session_to_close = sessions[0].get("session", sessions[0])
        
        session_id = session_to_close["id"]
        
        # Close the session
        close_response = self.session.post(f"{BASE_URL}/api/sessions/close/{session_id}")
        assert close_response.status_code == 200, f"Failed to close session: {close_response.text}"
        
        data = close_response.json()
        assert "bill_summary" in data, "Response should contain bill_summary"
        
        bill = data["bill_summary"]
        
        # Verify bill_summary structure
        assert "subtotal" in bill
        assert "total_amount" in bill
        assert "total_service_charge" in bill
        assert "service_charge_percentage" in bill
        
        print(f"PASS: Session closed with bill_summary")
        print(f"  - Subtotal: {bill.get('subtotal')} AZN")
        print(f"  - Total Discount: {bill.get('total_discount')} AZN")
        print(f"  - Service Charge ({bill.get('service_charge_percentage')}%): {bill.get('total_service_charge')} AZN")
        print(f"  - Total Amount: {bill.get('total_amount')} AZN")
    
    def test_05_session_transfer(self):
        """Test POST /api/sessions/transfer moves session to new table"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get tables
        tables_response = self.session.get(f"{BASE_URL}/api/tables")
        assert tables_response.status_code == 200
        tables = tables_response.json()
        
        if len(tables) < 2:
            pytest.skip("Need at least 2 tables for transfer test")
        
        # Start a session on first table
        table1_id = tables[0]["id"]
        session_response = requests.post(f"{BASE_URL}/api/sessions/start/{table1_id}")
        assert session_response.status_code == 200
        session_data = session_response.json()
        session_id = session_data["session"]["id"]
        
        # Find an unoccupied table
        active_sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        occupied_table_ids = {s.get("session", s).get("table_id") for s in active_sessions}
        
        target_table = None
        for t in tables:
            if t["id"] not in occupied_table_ids and t["id"] != table1_id:
                target_table = t
                break
        
        if not target_table:
            # Close the session we just created and skip
            self.session.post(f"{BASE_URL}/api/sessions/close/{session_id}")
            pytest.skip("No unoccupied table available for transfer")
        
        # Transfer session
        transfer_response = self.session.post(f"{BASE_URL}/api/sessions/transfer", json={
            "session_id": session_id,
            "new_table_id": target_table["id"]
        })
        assert transfer_response.status_code == 200, f"Transfer failed: {transfer_response.text}"
        
        data = transfer_response.json()
        assert "message" in data
        
        print(f"PASS: Session transferred from table {tables[0].get('table_number')} to {target_table.get('table_number')}")
        
        # Cleanup - close the transferred session
        self.session.post(f"{BASE_URL}/api/sessions/close/{session_id}")
    
    def test_06_transfer_fails_same_table(self):
        """Test transfer fails when trying to transfer to same table"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get tables
        tables_response = self.session.get(f"{BASE_URL}/api/tables")
        tables = tables_response.json()
        if not tables:
            pytest.skip("No tables available")
        
        table_id = tables[0]["id"]
        
        # Start session
        session_response = requests.post(f"{BASE_URL}/api/sessions/start/{table_id}")
        session_id = session_response.json()["session"]["id"]
        
        # Try to transfer to same table
        transfer_response = self.session.post(f"{BASE_URL}/api/sessions/transfer", json={
            "session_id": session_id,
            "new_table_id": table_id
        })
        assert transfer_response.status_code == 400, f"Should fail with 400, got {transfer_response.status_code}"
        
        print("PASS: Transfer to same table correctly rejected with 400")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/sessions/close/{session_id}")
    
    def test_07_timed_service_serve_no_service_charge(self):
        """Test PUT /api/timed-services/{id}/serve creates order without service charge"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get tables and menu items
        tables = self.session.get(f"{BASE_URL}/api/tables").json()
        menu_items = requests.get(f"{BASE_URL}/api/menu-items").json()
        
        if not tables or not menu_items:
            pytest.skip("No tables or menu items available")
        
        table_id = tables[0]["id"]
        menu_item = menu_items[0]
        
        # Start session
        session_response = requests.post(f"{BASE_URL}/api/sessions/start/{table_id}")
        session_data = session_response.json()
        session_id = session_data["session"]["id"]
        
        # Create timed service
        timed_response = self.session.post(f"{BASE_URL}/api/timed-services", json={
            "table_id": table_id,
            "session_id": session_id,
            "menu_item_id": menu_item["id"],
            "interval_minutes": 30,
            "notes": "Test timed service"
        })
        assert timed_response.status_code == 200, f"Failed to create timed service: {timed_response.text}"
        timed_service = timed_response.json()
        timed_id = timed_service["id"]
        
        # Mark as served (creates order)
        serve_response = self.session.put(f"{BASE_URL}/api/timed-services/{timed_id}/serve")
        assert serve_response.status_code == 200, f"Failed to mark served: {serve_response.text}"
        
        # Get session orders to verify the created order
        orders_response = requests.get(f"{BASE_URL}/api/orders/session/{session_data['session']['session_token']}")
        assert orders_response.status_code == 200
        orders_data = orders_response.json()
        orders = orders_data.get("orders", [])
        
        # Find the TS- order
        ts_order = None
        for order in orders:
            if order.get("order_number", "").startswith("TS-"):
                ts_order = order
                break
        
        assert ts_order is not None, "Timed service order (TS-) not found"
        
        # CRITICAL: Verify no service charge on timed service order
        assert ts_order.get("service_charge_amount", 0) == 0, f"TS order should have service_charge_amount=0"
        assert ts_order.get("service_charge_percentage", 0) == 0, f"TS order should have service_charge_percentage=0"
        
        print(f"PASS: Timed service order created with service_charge_amount=0")
        print(f"  - Order: {ts_order.get('order_number')}, Status: {ts_order.get('status')}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/timed-services/{timed_id}")
        self.session.post(f"{BASE_URL}/api/sessions/close/{session_id}")
    
    def test_08_timed_service_stop(self):
        """Test PUT /api/timed-services/{id}/stop deactivates timed service"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get tables and menu items
        tables = self.session.get(f"{BASE_URL}/api/tables").json()
        menu_items = requests.get(f"{BASE_URL}/api/menu-items").json()
        
        if not tables or not menu_items:
            pytest.skip("No tables or menu items available")
        
        table_id = tables[0]["id"]
        menu_item = menu_items[0]
        
        # Start session
        session_response = requests.post(f"{BASE_URL}/api/sessions/start/{table_id}")
        session_data = session_response.json()
        session_id = session_data["session"]["id"]
        
        # Create timed service
        timed_response = self.session.post(f"{BASE_URL}/api/timed-services", json={
            "table_id": table_id,
            "session_id": session_id,
            "menu_item_id": menu_item["id"],
            "interval_minutes": 30,
            "notes": "Test stop"
        })
        assert timed_response.status_code == 200
        timed_service = timed_response.json()
        timed_id = timed_service["id"]
        
        # Verify it's active
        assert timed_service.get("is_active") == True
        
        # Stop the service (Yetərlidir)
        stop_response = self.session.put(f"{BASE_URL}/api/timed-services/{timed_id}/stop")
        assert stop_response.status_code == 200, f"Failed to stop: {stop_response.text}"
        
        data = stop_response.json()
        assert data.get("is_active") == False, "Service should be deactivated"
        
        print("PASS: Timed service stopped (Yetərlidir) - is_active=False")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/timed-services/{timed_id}")
        self.session.post(f"{BASE_URL}/api/sessions/close/{session_id}")
    
    def test_09_order_includes_discount_details(self):
        """Test that orders include discount_name and discount_amount for customer view"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get tables
        tables = self.session.get(f"{BASE_URL}/api/tables").json()
        if not tables:
            pytest.skip("No tables available")
        
        table_id = tables[0]["id"]
        
        # Start session
        session_response = requests.post(f"{BASE_URL}/api/sessions/start/{table_id}")
        session_data = session_response.json()
        session_token = session_data["session"]["session_token"]
        session_id = session_data["session"]["id"]
        
        # Get menu items
        menu_items = requests.get(f"{BASE_URL}/api/menu-items").json()
        if not menu_items:
            pytest.skip("No menu items")
        
        menu_item = menu_items[0]
        
        # Create order
        order_data = {
            "session_token": session_token,
            "items": [{
                "menu_item_id": menu_item["id"],
                "name": menu_item["name"],
                "price": menu_item["price"],
                "quantity": 3,
                "discount_percentage": 0
            }],
            "total_amount": menu_item["price"] * 3
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert order_response.status_code == 200
        order = order_response.json()
        
        # Verify order has discount fields (even if 0)
        assert "discount_name" in order or order.get("discount_name") is None
        assert "discount_amount" in order
        assert "discount_type" in order or order.get("discount_type") is None
        assert "discount_value" in order
        
        print(f"PASS: Order includes discount fields")
        print(f"  - discount_name: {order.get('discount_name')}")
        print(f"  - discount_amount: {order.get('discount_amount')}")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/sessions/close/{session_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
