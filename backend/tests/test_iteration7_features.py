"""
Iteration 7 Feature Tests:
1. PUT /api/timed-services/{id}/serve - Creates order when timed service marked served
2. PUT /api/timed-services/{id}/stop - Deactivates timed service ('Yetərlidir')
3. POST /api/sessions/transfer - Moves session to a new table
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration7Features:
    """Tests for Iteration 7: Timed Service Order Creation, Stop, and Table Transfer"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup: Delete test data created during tests
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test-created data"""
        try:
            # Delete test timed services
            timed_services = self.session.get(f"{BASE_URL}/api/timed-services/active").json()
            for svc in timed_services:
                if 'TEST_' in str(svc.get('notes', '')):
                    self.session.delete(f"{BASE_URL}/api/timed-services/{svc['id']}")
            
            # Delete test sessions
            sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
            for s in sessions:
                session_data = s.get('session', s)
                if session_data.get('id', '').startswith('TEST_'):
                    self.session.delete(f"{BASE_URL}/api/sessions/{session_data['id']}")
        except:
            pass
    
    # ==================== TIMED SERVICE SERVE TESTS ====================
    
    def test_mark_timed_service_served_creates_order(self):
        """Test: PUT /api/timed-services/{id}/serve creates an order with 'Vaxtlı xidmət' notes"""
        # Step 1: Get active sessions to find a table with session
        sessions_response = self.session.get(f"{BASE_URL}/api/sessions/active")
        assert sessions_response.status_code == 200
        sessions = sessions_response.json()
        
        if not sessions:
            pytest.skip("No active sessions available for testing")
        
        # Use first active session
        session_data = sessions[0].get('session', sessions[0])
        session_id = session_data['id']
        table_id = session_data['table_id']
        
        # Step 2: Get menu items to create timed service
        menu_response = self.session.get(f"{BASE_URL}/api/menu-items")
        assert menu_response.status_code == 200
        menu_items = menu_response.json()
        
        if not menu_items:
            pytest.skip("No menu items available for testing")
        
        menu_item = menu_items[0]
        
        # Step 3: Create a timed service
        timed_service_data = {
            "table_id": table_id,
            "session_id": session_id,
            "menu_item_id": menu_item['id'],
            "interval_minutes": 30,
            "notes": "TEST_timed_service_serve"
        }
        create_response = self.session.post(f"{BASE_URL}/api/timed-services", json=timed_service_data)
        assert create_response.status_code == 200, f"Failed to create timed service: {create_response.text}"
        timed_service = create_response.json()
        timed_service_id = timed_service['id']
        
        # Step 4: Get current order count for this session
        session_details = self.session.get(f"{BASE_URL}/api/sessions/{session_id}/details")
        assert session_details.status_code == 200
        initial_orders = session_details.json().get('orders', [])
        initial_order_count = len(initial_orders)
        
        # Step 5: Mark timed service as served
        serve_response = self.session.put(f"{BASE_URL}/api/timed-services/{timed_service_id}/serve")
        assert serve_response.status_code == 200, f"Failed to mark served: {serve_response.text}"
        
        # Step 6: Verify order was created
        session_details_after = self.session.get(f"{BASE_URL}/api/sessions/{session_id}/details")
        assert session_details_after.status_code == 200
        orders_after = session_details_after.json().get('orders', [])
        
        # Should have one more order
        assert len(orders_after) == initial_order_count + 1, f"Expected {initial_order_count + 1} orders, got {len(orders_after)}"
        
        # Find the new order (should have 'Vaxtlı xidmət' in notes or order_number starts with TS-)
        new_orders = [o for o in orders_after if o.get('order_number', '').startswith('TS-')]
        assert len(new_orders) > 0, "No timed service order found (order_number should start with TS-)"
        
        # Verify the order contains the correct menu item
        new_order = new_orders[-1]  # Get the latest TS order
        assert len(new_order.get('items', [])) == 1, "Timed service order should have exactly 1 item"
        assert new_order['items'][0]['menu_item_id'] == menu_item['id'], "Order item should match timed service menu item"
        
        print(f"✓ Timed service serve creates order: {new_order['order_number']}")
        
        # Cleanup: Delete the timed service
        self.session.delete(f"{BASE_URL}/api/timed-services/{timed_service_id}")
    
    def test_mark_served_updates_serve_count(self):
        """Test: Marking served increments serve_count and updates next_serve_at"""
        # Get active session
        sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        if not sessions:
            pytest.skip("No active sessions")
        
        session_data = sessions[0].get('session', sessions[0])
        session_id = session_data['id']
        table_id = session_data['table_id']
        
        # Get menu item
        menu_items = self.session.get(f"{BASE_URL}/api/menu-items").json()
        if not menu_items:
            pytest.skip("No menu items")
        
        # Create timed service
        create_resp = self.session.post(f"{BASE_URL}/api/timed-services", json={
            "table_id": table_id,
            "session_id": session_id,
            "menu_item_id": menu_items[0]['id'],
            "interval_minutes": 45,
            "notes": "TEST_serve_count"
        })
        assert create_resp.status_code == 200
        svc = create_resp.json()
        svc_id = svc['id']
        initial_count = svc.get('serve_count', 0)
        
        # Mark served
        serve_resp = self.session.put(f"{BASE_URL}/api/timed-services/{svc_id}/serve")
        assert serve_resp.status_code == 200
        updated_svc = serve_resp.json()
        
        # Verify serve_count incremented
        assert updated_svc.get('serve_count', 0) == initial_count + 1, "serve_count should increment"
        assert updated_svc.get('last_served_at') is not None, "last_served_at should be set"
        assert updated_svc.get('next_serve_at') is not None, "next_serve_at should be set"
        
        print(f"✓ Serve count updated: {initial_count} -> {updated_svc['serve_count']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/timed-services/{svc_id}")
    
    # ==================== TIMED SERVICE STOP TESTS ====================
    
    def test_stop_timed_service_deactivates(self):
        """Test: PUT /api/timed-services/{id}/stop deactivates the service"""
        # Get active session
        sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        if not sessions:
            pytest.skip("No active sessions")
        
        session_data = sessions[0].get('session', sessions[0])
        session_id = session_data['id']
        table_id = session_data['table_id']
        
        # Get menu item
        menu_items = self.session.get(f"{BASE_URL}/api/menu-items").json()
        if not menu_items:
            pytest.skip("No menu items")
        
        # Create timed service
        create_resp = self.session.post(f"{BASE_URL}/api/timed-services", json={
            "table_id": table_id,
            "session_id": session_id,
            "menu_item_id": menu_items[0]['id'],
            "interval_minutes": 30,
            "notes": "TEST_stop_service"
        })
        assert create_resp.status_code == 200
        svc = create_resp.json()
        svc_id = svc['id']
        
        # Verify it's active
        assert svc.get('is_active') == True, "Service should be active initially"
        
        # Stop the service
        stop_resp = self.session.put(f"{BASE_URL}/api/timed-services/{svc_id}/stop")
        assert stop_resp.status_code == 200, f"Failed to stop service: {stop_resp.text}"
        stop_data = stop_resp.json()
        
        # Verify response
        assert stop_data.get('is_active') == False, "Service should be deactivated"
        assert 'dayandırıldı' in stop_data.get('message', '').lower() or stop_data.get('is_active') == False
        
        # Verify by fetching the service again
        all_services = self.session.get(f"{BASE_URL}/api/timed-services?session_id={session_id}").json()
        stopped_svc = next((s for s in all_services if s['id'] == svc_id), None)
        assert stopped_svc is not None, "Service should still exist"
        assert stopped_svc.get('is_active') == False, "Service should be inactive after stop"
        
        print(f"✓ Timed service stopped successfully: is_active={stopped_svc['is_active']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/timed-services/{svc_id}")
    
    def test_stop_nonexistent_service_returns_404(self):
        """Test: Stopping non-existent service returns 404"""
        fake_id = "nonexistent-service-id-12345"
        stop_resp = self.session.put(f"{BASE_URL}/api/timed-services/{fake_id}/stop")
        assert stop_resp.status_code == 404, f"Expected 404, got {stop_resp.status_code}"
        print("✓ Stop non-existent service returns 404")
    
    # ==================== TABLE TRANSFER TESTS ====================
    
    def test_transfer_session_to_new_table(self):
        """Test: POST /api/sessions/transfer moves session, orders, and timed services"""
        # Get active sessions
        sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        if not sessions:
            pytest.skip("No active sessions for transfer test")
        
        # Get all tables
        tables = self.session.get(f"{BASE_URL}/api/tables").json()
        if len(tables) < 2:
            pytest.skip("Need at least 2 tables for transfer test")
        
        # Find a session and an available table
        session_data = sessions[0].get('session', sessions[0])
        session_id = session_data['id']
        old_table_id = session_data['table_id']
        
        # Find a table without active session
        active_table_ids = {s.get('session', s)['table_id'] for s in sessions}
        available_tables = [t for t in tables if t['id'] not in active_table_ids]
        
        if not available_tables:
            pytest.skip("No available tables for transfer")
        
        new_table = available_tables[0]
        new_table_id = new_table['id']
        
        # Perform transfer
        transfer_resp = self.session.post(f"{BASE_URL}/api/sessions/transfer", json={
            "session_id": session_id,
            "new_table_id": new_table_id
        })
        assert transfer_resp.status_code == 200, f"Transfer failed: {transfer_resp.text}"
        transfer_data = transfer_resp.json()
        
        # Verify response
        assert 'message' in transfer_data or 'session' in transfer_data
        
        # Verify session was moved
        updated_sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        transferred_session = None
        for s in updated_sessions:
            sess = s.get('session', s)
            if sess['id'] == session_id:
                transferred_session = sess
                break
        
        assert transferred_session is not None, "Session should still exist"
        assert transferred_session['table_id'] == new_table_id, f"Session should be on new table. Expected {new_table_id}, got {transferred_session['table_id']}"
        
        print(f"✓ Session transferred from table {old_table_id[:8]}... to {new_table_id[:8]}...")
        
        # Transfer back for cleanup
        self.session.post(f"{BASE_URL}/api/sessions/transfer", json={
            "session_id": session_id,
            "new_table_id": old_table_id
        })
    
    def test_transfer_fails_if_target_has_active_session(self):
        """Test: Transfer fails if new table already has an active session"""
        # Get active sessions
        sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        if len(sessions) < 2:
            pytest.skip("Need at least 2 active sessions for this test")
        
        # Try to transfer session 1 to session 2's table
        session1 = sessions[0].get('session', sessions[0])
        session2 = sessions[1].get('session', sessions[1])
        
        transfer_resp = self.session.post(f"{BASE_URL}/api/sessions/transfer", json={
            "session_id": session1['id'],
            "new_table_id": session2['table_id']
        })
        
        assert transfer_resp.status_code == 400, f"Expected 400, got {transfer_resp.status_code}"
        error_detail = transfer_resp.json().get('detail', '')
        assert 'aktiv sessiya' in error_detail.lower() or 'active' in error_detail.lower(), f"Error should mention active session: {error_detail}"
        
        print(f"✓ Transfer to occupied table correctly rejected: {error_detail}")
    
    def test_transfer_fails_if_same_table(self):
        """Test: Transfer fails if same table is selected"""
        # Get active session
        sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        if not sessions:
            pytest.skip("No active sessions")
        
        session_data = sessions[0].get('session', sessions[0])
        session_id = session_data['id']
        table_id = session_data['table_id']
        
        # Try to transfer to same table
        transfer_resp = self.session.post(f"{BASE_URL}/api/sessions/transfer", json={
            "session_id": session_id,
            "new_table_id": table_id
        })
        
        assert transfer_resp.status_code == 400, f"Expected 400, got {transfer_resp.status_code}"
        error_detail = transfer_resp.json().get('detail', '')
        assert 'eyni' in error_detail.lower() or 'same' in error_detail.lower(), f"Error should mention same table: {error_detail}"
        
        print(f"✓ Transfer to same table correctly rejected: {error_detail}")
    
    def test_transfer_nonexistent_session_returns_404(self):
        """Test: Transfer with non-existent session returns 404"""
        tables = self.session.get(f"{BASE_URL}/api/tables").json()
        if not tables:
            pytest.skip("No tables available")
        
        transfer_resp = self.session.post(f"{BASE_URL}/api/sessions/transfer", json={
            "session_id": "nonexistent-session-id-12345",
            "new_table_id": tables[0]['id']
        })
        
        assert transfer_resp.status_code == 404, f"Expected 404, got {transfer_resp.status_code}"
        print("✓ Transfer non-existent session returns 404")
    
    def test_transfer_to_nonexistent_table_returns_404(self):
        """Test: Transfer to non-existent table returns 404"""
        sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        if not sessions:
            pytest.skip("No active sessions")
        
        session_data = sessions[0].get('session', sessions[0])
        
        transfer_resp = self.session.post(f"{BASE_URL}/api/sessions/transfer", json={
            "session_id": session_data['id'],
            "new_table_id": "nonexistent-table-id-12345"
        })
        
        assert transfer_resp.status_code == 404, f"Expected 404, got {transfer_resp.status_code}"
        print("✓ Transfer to non-existent table returns 404")


class TestTimedServiceOrderVerification:
    """Additional tests to verify order creation details"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_served_order_has_correct_status(self):
        """Test: Order created by serve has 'delivered' status"""
        sessions = self.session.get(f"{BASE_URL}/api/sessions/active").json()
        if not sessions:
            pytest.skip("No active sessions")
        
        session_data = sessions[0].get('session', sessions[0])
        menu_items = self.session.get(f"{BASE_URL}/api/menu-items").json()
        if not menu_items:
            pytest.skip("No menu items")
        
        # Create and serve
        create_resp = self.session.post(f"{BASE_URL}/api/timed-services", json={
            "table_id": session_data['table_id'],
            "session_id": session_data['id'],
            "menu_item_id": menu_items[0]['id'],
            "interval_minutes": 30,
            "notes": "TEST_order_status"
        })
        svc = create_resp.json()
        
        self.session.put(f"{BASE_URL}/api/timed-services/{svc['id']}/serve")
        
        # Check order status
        details = self.session.get(f"{BASE_URL}/api/sessions/{session_data['id']}/details").json()
        ts_orders = [o for o in details.get('orders', []) if o.get('order_number', '').startswith('TS-')]
        
        if ts_orders:
            latest_order = ts_orders[-1]
            assert latest_order.get('status') == 'delivered', f"Expected 'delivered', got {latest_order.get('status')}"
            print(f"✓ Timed service order has correct status: {latest_order['status']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/timed-services/{svc['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
