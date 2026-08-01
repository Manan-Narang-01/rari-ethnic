"""Backend API tests for the Categories + Cart schema addition. Follows the
same live-HTTP convention as backend_auth_test.py -- point REACT_APP_BACKEND_URL
(or frontend/.env) at a running instance with a reachable MongoDB before running."""
import os
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"


def _unique_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@example.com"


def _unique_key():
    return f"test-cat-{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def s():
    ses = requests.Session()
    ses.headers.update({"Content-Type": "application/json"})
    return ses


@pytest.fixture(scope="module")
def admin_headers(s):
    """Logs in with whichever admin/super_admin account is seeded in this
    environment (see backend/.env). Skips admin-gated tests if neither is
    configured, rather than failing on an environment-specific precondition."""
    email = os.environ.get("SUPER_ADMIN_EMAIL") or os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("SUPER_ADMIN_PASSWORD") or os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        pytest.skip("No admin/super_admin credentials configured in backend/.env")
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        pytest.skip(f"Seeded admin credentials didn't authenticate: {r.text}")
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestCategories:
    category_id = None
    category_key = None

    def test_public_list_returns_seeded_defaults(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        keys = {c["key"] for c in r.json()}
        assert {"kurtis", "suits", "lehengas"}.issubset(keys)

    def test_admin_create_category(self, s, admin_headers):
        TestCategories.category_key = _unique_key()
        r = s.post(f"{API}/admin/categories", headers=admin_headers, json={
            "key": TestCategories.category_key, "name": "TEST Category", "sort_order": 99,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["key"] == TestCategories.category_key
        assert d["is_active"] is True
        TestCategories.category_id = d["id"]

    def test_admin_create_duplicate_key_conflict(self, s, admin_headers):
        r = s.post(f"{API}/admin/categories", headers=admin_headers, json={
            "key": TestCategories.category_key, "name": "Duplicate",
        })
        assert r.status_code == 409

    def test_admin_create_without_key_auto_slugifies(self, s, admin_headers):
        r = s.post(f"{API}/admin/categories", headers=admin_headers, json={"name": "TEST Auto Slug Category"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["key"] == "test-auto-slug-category"
        # cleanup
        s.delete(f"{API}/admin/categories/{d['id']}", headers=admin_headers)

    def test_admin_update_category(self, s, admin_headers):
        r = s.put(f"{API}/admin/categories/{TestCategories.category_id}", headers=admin_headers,
                   json={"name": "TEST Category Renamed"})
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "TEST Category Renamed"

    def test_create_product_with_unknown_category_400(self, s, admin_headers):
        r = s.post(f"{API}/admin/products", headers=admin_headers, json={
            "name": "TEST Product Bad Category", "categories": ["does-not-exist"], "price": 999,
        })
        assert r.status_code == 400

    def test_delete_category_blocked_while_in_use(self, s, admin_headers):
        product = s.post(f"{API}/admin/products", headers=admin_headers, json={
            "name": "TEST Product In Category", "categories": [TestCategories.category_key], "price": 999,
        })
        assert product.status_code == 200, product.text
        product_id = product.json()["id"]

        r = s.delete(f"{API}/admin/categories/{TestCategories.category_id}", headers=admin_headers)
        assert r.status_code == 409

        # cleanup the product, then deletion should succeed
        s.delete(f"{API}/admin/products/{product_id}", headers=admin_headers)
        r = s.delete(f"{API}/admin/categories/{TestCategories.category_id}", headers=admin_headers)
        assert r.status_code == 200, r.text

    def test_non_admin_cannot_manage_categories(self, s):
        email, password = _unique_email(), "Sup3rSecret!"
        s.post(f"{API}/auth/register", json={"name": "TEST Customer", "email": email, "password": password})
        login = s.post(f"{API}/auth/login", json={"email": email, "password": password})
        customer_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        r = s.post(f"{API}/admin/categories", headers=customer_headers, json={"name": "Should Fail"})
        assert r.status_code == 403


class TestCart:
    access_token = None

    def test_register_customer(self, s):
        email = _unique_email()
        r = s.post(f"{API}/auth/register", json={
            "name": "TEST Cart Customer", "email": email, "password": "Sup3rSecret!",
        })
        assert r.status_code == 200, r.text
        TestCart.access_token = r.json()["access_token"]

    def test_get_cart_unauthenticated_401(self, s):
        r = s.get(f"{API}/me/cart")
        assert r.status_code == 401

    def test_get_empty_cart(self, s):
        r = s.get(f"{API}/me/cart", headers={"Authorization": f"Bearer {TestCart.access_token}"})
        assert r.status_code == 200, r.text
        assert r.json()["items"] == []

    def test_replace_cart_round_trips(self, s):
        items = [{
            "product_id": "p1", "slug": "test-product", "name": "Test Product",
            "price": 1999, "quantity": 2, "size": "M", "image": "https://example.com/x.jpg",
        }]
        r = s.put(f"{API}/me/cart", headers={"Authorization": f"Bearer {TestCart.access_token}"},
                  json={"items": items})
        assert r.status_code == 200, r.text
        assert r.json()["items"][0]["product_id"] == "p1"

        r = s.get(f"{API}/me/cart", headers={"Authorization": f"Bearer {TestCart.access_token}"})
        assert len(r.json()["items"]) == 1
        assert r.json()["items"][0]["quantity"] == 2

    def test_clear_cart(self, s):
        r = s.delete(f"{API}/me/cart", headers={"Authorization": f"Bearer {TestCart.access_token}"})
        assert r.status_code == 200

        r = s.get(f"{API}/me/cart", headers={"Authorization": f"Bearer {TestCart.access_token}"})
        assert r.json()["items"] == []
