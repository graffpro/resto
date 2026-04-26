"""Iteration 11 feature tests.

Covers:
1. Multi-tenant isolation (admin vs new tenant vs owner)
2. Public customer endpoints (categories/menu-items by restaurant_id)
3. Restaurant toggle-status -> child users reactivate
4. Partner Restaurants public list (featured + nearby)
5. Partner ratings (POST + GET, aggregate)
6. Owner partner CRUD (auth required)
7. Translation endpoint (cache works)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

OWNER = {"username": "graff", "password": "Testforresto123"}
ADMIN_EMIN = {"username": "admin1", "password": "admin123"}
EMIN_RESTAURANT_ID = "e211ddf8-ed99-4af0-956d-2e521759f079"
TABLE_ID = "54e3595b-8a97-4b6b-8818-95bb2756d9d9"


# ---------------- Helpers ----------------
def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['username']}: {r.status_code} {r.text}"
    return r.json()["token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def owner_token():
    return login(OWNER)


@pytest.fixture(scope="module")
def admin_token():
    return login(ADMIN_EMIN)


@pytest.fixture(scope="module")
def new_tenant():
    """Register a fresh tenant. Tear down via owner credentials at module end."""
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "restaurant_name": f"TEST_Tenant_{suffix}",
        "owner_name": "TEST Owner",
        "username": f"test_admin_{suffix}",
        "password": "TestPass123",
        "phone": "+994500000000",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    yield {"token": data["token"], "user": data["user"], "restaurant": data["restaurant"], "creds": payload}
    # cleanup: delete restaurant via owner
    try:
        owner_tk = login(OWNER)
        requests.delete(
            f"{API}/restaurants/{data['restaurant']['id']}",
            headers=auth_headers(owner_tk), timeout=15,
        )
    except Exception:
        pass


# ---------------- 1. Multi-tenant isolation ----------------
class TestMultiTenantIsolation:
    """Admin of tenant A must NOT see tenant B's data. Owner sees all."""

    @pytest.mark.parametrize("path", [
        "/categories", "/menu-items", "/venues", "/tables",
        "/orders/waiter", "/orders/kitchen",
        "/sessions/active", "/discounts",
    ])
    def test_admin_vs_new_tenant_isolation(self, admin_token, new_tenant, path):
        a = requests.get(f"{API}{path}", headers=auth_headers(admin_token), timeout=15)
        b = requests.get(f"{API}{path}", headers=auth_headers(new_tenant["token"]), timeout=15)
        assert a.status_code == 200, f"emin GET {path} -> {a.status_code} {a.text[:200]}"
        assert b.status_code == 200, f"new tenant GET {path} -> {b.status_code} {b.text[:200]}"
        a_list = a.json() if isinstance(a.json(), list) else []
        b_list = b.json() if isinstance(b.json(), list) else []
        # New tenant must be empty (just registered)
        assert b_list == [], f"new tenant should see [] on {path}, got {len(b_list)} items"
        # If emin has data, ensure none of it leaks to new tenant
        if a_list:
            a_ids = {x.get("id") for x in a_list if isinstance(x, dict)}
            b_ids = {x.get("id") for x in b_list if isinstance(x, dict)}
            assert a_ids.isdisjoint(b_ids), f"DATA LEAK on {path}"

    def test_owner_sees_all(self, owner_token, admin_token):
        # Owner should see >= what admin sees on /categories
        adm = requests.get(f"{API}/categories", headers=auth_headers(admin_token), timeout=15).json()
        own = requests.get(f"{API}/categories", headers=auth_headers(owner_token), timeout=15).json()
        assert len(own) >= len(adm), f"owner should see >= admin (own={len(own)}, adm={len(adm)})"


# ---------------- 2. Customer (public) flow ----------------
class TestCustomerFlow:
    def test_session_start_returns_restaurant_id(self):
        # Endpoint is POST (review request had typo)
        r = requests.post(
            f"{API}/sessions/start/{TABLE_ID}",
            json={"device_id": f"test-device-{uuid.uuid4().hex[:6]}", "force_takeover": True},
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        rid = data.get("restaurant_id") or data.get("table", {}).get("restaurant_id") or data.get("session", {}).get("restaurant_id")
        assert rid, f"no restaurant_id in response: {data}"

    def test_categories_with_restaurant_id_no_auth(self):
        r = requests.get(f"{API}/categories", params={"restaurant_id": EMIN_RESTAURANT_ID}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_menu_items_with_restaurant_id_no_auth(self):
        r = requests.get(f"{API}/menu-items", params={"restaurant_id": EMIN_RESTAURANT_ID}, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_categories_no_restaurant_no_auth_returns_empty(self):
        r = requests.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        assert r.json() == []

    def test_menu_items_no_restaurant_no_auth_returns_empty(self):
        r = requests.get(f"{API}/menu-items", timeout=15)
        assert r.status_code == 200
        assert r.json() == []


# ---------------- 3. Restaurant toggle-status reactivation ----------------
class TestRestaurantToggle:
    def test_toggle_deactivates_then_reactivates_children(self, owner_token, new_tenant):
        rid = new_tenant["restaurant"]["id"]
        creds = new_tenant["creds"]

        # Deactivate
        r = requests.put(f"{API}/restaurants/{rid}/toggle-status", headers=auth_headers(owner_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("is_active") is False

        # login should fail
        r2 = requests.post(f"{API}/auth/login", json={"username": creds["username"], "password": creds["password"]}, timeout=15)
        assert r2.status_code == 403, f"expected 403 after deactivation, got {r2.status_code}"

        # Reactivate
        r3 = requests.put(f"{API}/restaurants/{rid}/toggle-status", headers=auth_headers(owner_token), timeout=15)
        assert r3.status_code == 200
        assert r3.json().get("is_active") is True

        # login should succeed
        r4 = requests.post(f"{API}/auth/login", json={"username": creds["username"], "password": creds["password"]}, timeout=15)
        assert r4.status_code == 200, f"login after reactivation failed: {r4.status_code} {r4.text}"


# ---------------- 4. Partner public list ----------------
class TestPartnerPublic:
    def test_list_visible_partners(self):
        r = requests.get(f"{API}/partner-restaurants", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1, "expected at least the seeded 9Lar Pub partner"
        for p in data:
            assert p.get("is_visible") is True

    def test_featured_filter(self):
        r = requests.get(f"{API}/partner-restaurants", params={"featured": "true"}, timeout=15)
        assert r.status_code == 200
        for p in r.json():
            assert p.get("is_featured") is True

    def test_nearby_filter_returns_distance(self):
        # Baku coords
        r = requests.get(
            f"{API}/partner-restaurants",
            params={"near_lat": 40.3777, "near_lng": 49.892, "radius_km": 100},
            timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        for p in data:
            assert "distance_km" in p


# ---------------- 5. Partner ratings ----------------
class TestPartnerRatings:
    @pytest.fixture(scope="class")
    def partner_id(self):
        r = requests.get(f"{API}/partner-restaurants", timeout=15)
        partners = r.json()
        assert partners, "no partners available"
        return partners[0]["id"]

    def test_post_rating_updates_aggregate(self, partner_id):
        before = requests.get(f"{API}/partner-restaurants/{partner_id}", timeout=15).json()
        before_count = before.get("ratings_count", 0)

        r = requests.post(
            f"{API}/partner-restaurants/{partner_id}/rate",
            json={"stars": 5, "comment": "TEST_rating_iter11"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["ratings_count"] == before_count + 1
        assert 1 <= body["rating_avg"] <= 5

    def test_list_ratings(self, partner_id):
        r = requests.get(f"{API}/partner-restaurants/{partner_id}/ratings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any(rt.get("comment") == "TEST_rating_iter11" for rt in data)


# ---------------- 6. Owner partner CRUD authorization ----------------
class TestOwnerPartners:
    def test_owner_partners_requires_owner(self, admin_token):
        r = requests.get(f"{API}/owner/partners", headers=auth_headers(admin_token), timeout=15)
        assert r.status_code == 403

    def test_owner_partners_owner_ok(self, owner_token):
        r = requests.get(f"{API}/owner/partners", headers=auth_headers(owner_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_eligible_restaurants_owner_only(self, admin_token, owner_token):
        r1 = requests.get(f"{API}/owner/eligible-restaurants", headers=auth_headers(admin_token), timeout=15)
        assert r1.status_code == 403
        r2 = requests.get(f"{API}/owner/eligible-restaurants", headers=auth_headers(owner_token), timeout=15)
        assert r2.status_code == 200

    def test_create_update_delete_partner(self, owner_token, new_tenant):
        rid = new_tenant["restaurant"]["id"]
        # Create
        payload = {
            "restaurant_id": rid,
            "name": "TEST_Partner",
            "address": "TEST address",
            "is_featured": False,
            "is_visible": True,
            "latitude": 40.4,
            "longitude": 49.9,
        }
        r = requests.post(f"{API}/owner/partners", json=payload, headers=auth_headers(owner_token), timeout=15)
        assert r.status_code == 200, f"create partner failed: {r.status_code} {r.text}"
        pid = r.json()["id"]

        # Update
        r2 = requests.put(
            f"{API}/owner/partners/{pid}",
            json={"is_featured": True, "name": "TEST_Partner_Updated"},
            headers=auth_headers(owner_token), timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json().get("is_featured") is True
        assert r2.json().get("name") == "TEST_Partner_Updated"

        # Delete
        r3 = requests.delete(f"{API}/owner/partners/{pid}", headers=auth_headers(owner_token), timeout=15)
        assert r3.status_code == 200


# ---------------- 7. Translation endpoint ----------------
class TestTranslate:
    def test_translate_and_cache(self):
        # Use a unique sentence so first call is uncached
        unique = uuid.uuid4().hex[:6]
        text = f"Salam dünya {unique}"
        r1 = requests.post(f"{API}/translate", json={"text": text, "target_lang": "en"}, timeout=30)
        assert r1.status_code == 200, f"translate first call failed: {r1.status_code} {r1.text}"
        body1 = r1.json()
        assert "translated" in body1 or "text" in body1, f"unexpected response: {body1}"
        translated_field = "translated" if "translated" in body1 else "text"
        assert isinstance(body1[translated_field], str) and len(body1[translated_field]) > 0

        # Second call should be cached
        r2 = requests.post(f"{API}/translate", json={"text": text, "target_lang": "en"}, timeout=15)
        assert r2.status_code == 200
        body2 = r2.json()
        assert body2.get("cached") is True, f"expected cached=true on second call, body={body2}"
