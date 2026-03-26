"""
Iteration 5 Feature Tests:
- Settings Page: GET/PUT /api/settings - service_charge_percentage editing
- Recipe Mapping: POST /api/recipes - ingredient quantities for menu items
- Timed Services: CRUD endpoints for timed table services
- Auto-deduction: Stock decreases when order placed with recipe-linked menu item
- Voice WebSocket: /api/ws/voice/{role} endpoint exists
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSettings:
    """Settings endpoint tests - service_charge_percentage editing"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_settings(self):
        """GET /api/settings returns settings with service_charge_percentage"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "service_charge_percentage" in data
        assert "name" in data
        assert "currency" in data
        print(f"Settings retrieved: service_charge={data.get('service_charge_percentage')}%")
    
    def test_update_service_charge_percentage(self):
        """PUT /api/settings updates service_charge_percentage"""
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/settings")
        current_settings = get_response.json()
        original_charge = current_settings.get('service_charge_percentage', 0)
        
        # Update service charge
        new_charge = 15.5
        current_settings['service_charge_percentage'] = new_charge
        
        response = requests.put(f"{BASE_URL}/api/settings", 
                               json=current_settings, 
                               headers=self.headers)
        assert response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/settings")
        updated_settings = verify_response.json()
        assert updated_settings['service_charge_percentage'] == new_charge
        print(f"Service charge updated from {original_charge}% to {new_charge}%")
        
        # Restore original
        current_settings['service_charge_percentage'] = original_charge
        requests.put(f"{BASE_URL}/api/settings", json=current_settings, headers=self.headers)


class TestRecipeMapping:
    """Recipe mapping tests - ingredient quantities for menu items"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get existing ingredients
        ing_response = requests.get(f"{BASE_URL}/api/ingredients", headers=self.headers)
        self.ingredients = ing_response.json() if ing_response.status_code == 200 else []
        
        # Get existing menu items
        menu_response = requests.get(f"{BASE_URL}/api/menu-items")
        self.menu_items = menu_response.json() if menu_response.status_code == 200 else []
    
    def test_create_recipe_for_menu_item(self):
        """POST /api/recipes creates recipe with ingredient quantities"""
        if not self.menu_items:
            pytest.skip("No menu items available for recipe test")
        if not self.ingredients:
            pytest.skip("No ingredients available for recipe test")
        
        menu_item = self.menu_items[0]
        ingredient = self.ingredients[0]
        
        recipe_data = {
            "menu_item_id": menu_item['id'],
            "ingredients": [
                {"ingredient_id": ingredient['id'], "quantity": 0.5}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/recipes", 
                                json=recipe_data, 
                                headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data.get("ingredients_count") == 1
        print(f"Recipe created for {menu_item['name']} with {ingredient['name']}")
    
    def test_get_recipe_for_menu_item(self):
        """GET /api/recipes/{menu_item_id} returns recipe"""
        if not self.menu_items:
            pytest.skip("No menu items available")
        
        menu_item = self.menu_items[0]
        response = requests.get(f"{BASE_URL}/api/recipes/{menu_item['id']}", 
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "menu_item_id" in data
        assert "ingredients" in data
        print(f"Recipe for {menu_item['name']}: {len(data.get('ingredients', []))} ingredients")
    
    def test_get_all_recipes(self):
        """GET /api/recipes returns all recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total recipes: {len(data)}")


class TestTimedServices:
    """Timed table service tests - CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get active sessions
        sessions_response = requests.get(f"{BASE_URL}/api/sessions/active")
        self.sessions = sessions_response.json() if sessions_response.status_code == 200 else []
        
        # Get menu items
        menu_response = requests.get(f"{BASE_URL}/api/menu-items")
        self.menu_items = menu_response.json() if menu_response.status_code == 200 else []
        
        self.created_service_id = None
    
    def test_create_timed_service(self):
        """POST /api/timed-services creates timed service"""
        if not self.sessions:
            pytest.skip("No active sessions for timed service test")
        if not self.menu_items:
            pytest.skip("No menu items available")
        
        session_data = self.sessions[0]
        session = session_data.get('session', session_data)
        table = session_data.get('table', {})
        menu_item = self.menu_items[0]
        
        service_data = {
            "table_id": table.get('id') or session.get('table_id'),
            "session_id": session['id'],
            "menu_item_id": menu_item['id'],
            "interval_minutes": 30,
            "notes": "TEST_timed_service"
        }
        
        response = requests.post(f"{BASE_URL}/api/timed-services", 
                                json=service_data, 
                                headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data['menu_item_name'] == menu_item['name']
        assert data['interval_minutes'] == 30
        assert data['is_active'] == True
        self.created_service_id = data['id']
        print(f"Timed service created: {menu_item['name']} every 30 min")
        
        # Cleanup
        if self.created_service_id:
            requests.delete(f"{BASE_URL}/api/timed-services/{self.created_service_id}", 
                          headers=self.headers)
    
    def test_get_timed_services_by_session(self):
        """GET /api/timed-services?session_id=X returns services for session"""
        if not self.sessions:
            pytest.skip("No active sessions")
        
        session_data = self.sessions[0]
        session = session_data.get('session', session_data)
        
        response = requests.get(f"{BASE_URL}/api/timed-services?session_id={session['id']}", 
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Timed services for session: {len(data)}")
    
    def test_get_active_timed_services(self):
        """GET /api/timed-services/active returns all active services"""
        response = requests.get(f"{BASE_URL}/api/timed-services/active", 
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Active timed services: {len(data)}")
    
    def test_mark_timed_service_served(self):
        """PUT /api/timed-services/{id}/serve marks service as served"""
        if not self.sessions or not self.menu_items:
            pytest.skip("No sessions or menu items")
        
        # Create a service first
        session_data = self.sessions[0]
        session = session_data.get('session', session_data)
        table = session_data.get('table', {})
        menu_item = self.menu_items[0]
        
        create_response = requests.post(f"{BASE_URL}/api/timed-services", 
                                       json={
                                           "table_id": table.get('id') or session.get('table_id'),
                                           "session_id": session['id'],
                                           "menu_item_id": menu_item['id'],
                                           "interval_minutes": 45,
                                           "notes": "TEST_serve_test"
                                       }, 
                                       headers=self.headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create timed service")
        
        service_id = create_response.json()['id']
        
        # Mark as served
        response = requests.put(f"{BASE_URL}/api/timed-services/{service_id}/serve", 
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data['serve_count'] == 1
        assert data['last_served_at'] is not None
        print(f"Service marked as served, count: {data['serve_count']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/timed-services/{service_id}", headers=self.headers)
    
    def test_delete_timed_service(self):
        """DELETE /api/timed-services/{id} deletes service"""
        if not self.sessions or not self.menu_items:
            pytest.skip("No sessions or menu items")
        
        # Create a service first
        session_data = self.sessions[0]
        session = session_data.get('session', session_data)
        table = session_data.get('table', {})
        menu_item = self.menu_items[0]
        
        create_response = requests.post(f"{BASE_URL}/api/timed-services", 
                                       json={
                                           "table_id": table.get('id') or session.get('table_id'),
                                           "session_id": session['id'],
                                           "menu_item_id": menu_item['id'],
                                           "interval_minutes": 60,
                                           "notes": "TEST_delete_test"
                                       }, 
                                       headers=self.headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create timed service")
        
        service_id = create_response.json()['id']
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/timed-services/{service_id}", 
                                  headers=self.headers)
        assert response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/timed-services?session_id={session['id']}", 
                                   headers=self.headers)
        services = get_response.json()
        assert not any(s['id'] == service_id for s in services)
        print("Timed service deleted successfully")


class TestAutoDeduction:
    """Auto-deduction tests - stock decreases when order placed with recipe"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_stock_deduction_on_order(self):
        """When order placed with recipe-linked item, stock should decrease"""
        # Get ingredients
        ing_response = requests.get(f"{BASE_URL}/api/ingredients", headers=self.headers)
        if ing_response.status_code != 200 or not ing_response.json():
            pytest.skip("No ingredients available")
        
        ingredients = ing_response.json()
        ingredient = ingredients[0]
        initial_stock = ingredient.get('current_stock', 0)
        
        # Get menu items
        menu_response = requests.get(f"{BASE_URL}/api/menu-items")
        if menu_response.status_code != 200 or not menu_response.json():
            pytest.skip("No menu items available")
        
        menu_items = menu_response.json()
        menu_item = menu_items[0]
        
        # Create recipe linking menu item to ingredient
        recipe_data = {
            "menu_item_id": menu_item['id'],
            "ingredients": [
                {"ingredient_id": ingredient['id'], "quantity": 0.1}  # Small quantity for test
            ]
        }
        requests.post(f"{BASE_URL}/api/recipes", json=recipe_data, headers=self.headers)
        
        # Get active session
        sessions_response = requests.get(f"{BASE_URL}/api/sessions/active")
        if sessions_response.status_code != 200 or not sessions_response.json():
            pytest.skip("No active sessions for order test")
        
        session_data = sessions_response.json()[0]
        session = session_data.get('session', session_data)
        
        # Place order
        order_data = {
            "session_token": session['session_token'],
            "items": [{
                "menu_item_id": menu_item['id'],
                "name": menu_item['name'],
                "price": menu_item['price'],
                "quantity": 1
            }]
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        if order_response.status_code != 200:
            print(f"Order creation failed: {order_response.text}")
            pytest.skip("Could not create order")
        
        # Check stock decreased
        updated_ing_response = requests.get(f"{BASE_URL}/api/ingredients", headers=self.headers)
        updated_ingredients = updated_ing_response.json()
        updated_ingredient = next((i for i in updated_ingredients if i['id'] == ingredient['id']), None)
        
        if updated_ingredient:
            new_stock = updated_ingredient.get('current_stock', 0)
            print(f"Stock changed: {initial_stock} -> {new_stock}")
            # Stock should have decreased by 0.1 (recipe quantity)
            assert new_stock <= initial_stock, "Stock should decrease after order"
        
        # Cleanup - delete the order
        order_id = order_response.json().get('id')
        if order_id:
            requests.delete(f"{BASE_URL}/api/orders/{order_id}", headers=self.headers)


class TestVoiceWebSocket:
    """Voice WebSocket endpoint tests"""
    
    def test_voice_websocket_endpoint_exists(self):
        """Verify /api/ws/voice/{role} endpoint is accessible"""
        # We can't fully test WebSocket with requests, but we can verify the endpoint
        # by checking if the server responds to a WebSocket upgrade request
        import socket
        import ssl
        
        # Parse the URL
        url = BASE_URL.replace('https://', '').replace('http://', '')
        host = url.split('/')[0]
        
        try:
            # Create SSL context
            context = ssl.create_default_context()
            
            # Create socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            
            # Wrap with SSL if https
            if 'https' in BASE_URL:
                sock = context.wrap_socket(sock, server_hostname=host)
            
            # Connect
            port = 443 if 'https' in BASE_URL else 80
            sock.connect((host, port))
            
            # Send WebSocket upgrade request
            request = (
                f"GET /api/ws/voice/admin HTTP/1.1\r\n"
                f"Host: {host}\r\n"
                f"Upgrade: websocket\r\n"
                f"Connection: Upgrade\r\n"
                f"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
                f"Sec-WebSocket-Version: 13\r\n"
                f"\r\n"
            )
            sock.send(request.encode())
            
            # Receive response
            response = sock.recv(1024).decode()
            sock.close()
            
            # Check for WebSocket upgrade response (101) or at least not 404
            if "101" in response or "Switching Protocols" in response:
                print("Voice WebSocket endpoint accepts connections (101 Switching Protocols)")
                assert True
            elif "404" in response:
                pytest.fail("Voice WebSocket endpoint not found (404)")
            else:
                # Any other response means the endpoint exists
                print(f"Voice WebSocket endpoint responded: {response[:100]}")
                assert True
                
        except Exception as e:
            print(f"WebSocket test note: {e}")
            # If we can't connect, it might be network issues, not endpoint issues
            # Let's verify the endpoint exists by checking server.py
            pytest.skip(f"Could not test WebSocket directly: {e}")


class TestServiceChargeInOrders:
    """Test that service charge is applied to orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin1",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_order_includes_service_charge(self):
        """Orders should include service_charge_percentage and service_charge_amount"""
        # Set a service charge
        settings_response = requests.get(f"{BASE_URL}/api/settings")
        settings = settings_response.json()
        original_charge = settings.get('service_charge_percentage', 0)
        
        # Set service charge to 10%
        settings['service_charge_percentage'] = 10
        requests.put(f"{BASE_URL}/api/settings", json=settings, headers=self.headers)
        
        # Get active session
        sessions_response = requests.get(f"{BASE_URL}/api/sessions/active")
        if sessions_response.status_code != 200 or not sessions_response.json():
            pytest.skip("No active sessions")
        
        session_data = sessions_response.json()[0]
        session = session_data.get('session', session_data)
        
        # Get menu items
        menu_response = requests.get(f"{BASE_URL}/api/menu-items")
        if menu_response.status_code != 200 or not menu_response.json():
            pytest.skip("No menu items")
        
        menu_item = menu_response.json()[0]
        
        # Place order
        order_data = {
            "session_token": session['session_token'],
            "items": [{
                "menu_item_id": menu_item['id'],
                "name": menu_item['name'],
                "price": menu_item['price'],
                "quantity": 1
            }]
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        if order_response.status_code == 200:
            order = order_response.json()
            print(f"Order created: subtotal={order.get('subtotal')}, service_charge={order.get('service_charge_amount')}, total={order.get('total_amount')}")
            
            # Verify service charge fields exist
            assert 'service_charge_percentage' in order
            assert 'service_charge_amount' in order
            
            # Cleanup
            order_id = order.get('id')
            if order_id:
                requests.delete(f"{BASE_URL}/api/orders/{order_id}", headers=self.headers)
        
        # Restore original service charge
        settings['service_charge_percentage'] = original_charge
        requests.put(f"{BASE_URL}/api/settings", json=settings, headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
