"""Backend API tests for Rari Ethnic e-commerce MVP."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    ses = requests.Session()
    ses.headers.update({"Content-Type": "application/json"})
    return ses


# ---------- Products ----------
class TestProducts:
    def test_list_all_products(self, s):
        r = s.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 12, f"Expected 12 seeded products, got {len(data)}"
        required = {"id", "slug", "name", "categories", "price", "images",
                    "sizes", "fabric", "care", "fit_notes", "occasion", "stock",
                    "is_bestseller", "is_new", "is_navratri", "edit_tag"}
        missing = required - set(data[0].keys())
        assert not missing, f"Missing fields: {missing}"
        # No mongo _id leak
        assert "_id" not in data[0]

    def test_filter_by_category_kurtis(self, s):
        r = s.get(f"{API}/products", params={"category": "kurtis"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all("kurtis" in p["categories"] for p in items)

    def test_filter_by_category_suits(self, s):
        r = s.get(f"{API}/products", params={"category": "suits"})
        assert r.status_code == 200
        assert all("suits" in p["categories"] for p in r.json())

    def test_filter_by_category_lehengas(self, s):
        r = s.get(f"{API}/products", params={"category": "lehengas"})
        assert r.status_code == 200
        assert all("lehengas" in p["categories"] for p in r.json())

    def test_filter_is_bestseller(self, s):
        r = s.get(f"{API}/products", params={"is_bestseller": "true"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all(p["is_bestseller"] is True for p in items)

    def test_filter_is_navratri(self, s):
        r = s.get(f"{API}/products", params={"is_navratri": "true"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all(p["is_navratri"] is True for p in items)

    def test_filter_is_new(self, s):
        r = s.get(f"{API}/products", params={"is_new": "true"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all(p["is_new"] is True for p in items)

    def test_get_product_by_slug(self, s):
        r = s.get(f"{API}/products/meher-maroon-kurti")
        assert r.status_code == 200
        p = r.json()
        assert p["slug"] == "meher-maroon-kurti"
        assert p["name"] == "Meher Maroon Chikankari Kurti"
        assert "kurtis" in p["categories"]
        assert p["price"] == 1599

    def test_get_product_unknown_slug_404(self, s):
        r = s.get(f"{API}/products/does-not-exist-xyz")
        assert r.status_code == 404


# ---------- Orders ----------
class TestOrders:
    order_number = None

    def test_create_order(self, s):
        # Order pricing is server-authoritative (see OrderService): it looks
        # up the real product by id and recomputes subtotal/shipping/total
        # from the database, ignoring whatever the client sends for them.
        product = s.get(f"{API}/products/meher-maroon-kurti").json()
        expected_subtotal = product["price"] * 2
        payload = {
            "customer_name": "TEST_Priya Sharma",
            "email": "TEST_priya@example.com",
            "phone": "9999999999",
            "address_line1": "12, Ring Road",
            "address_line2": "Near Chowk",
            "city": "Surat",
            "state": "Gujarat",
            "pincode": "395002",
            "notes": "Test order",
            "items": [{
                "product_id": product["id"],
                "slug": product["slug"],
                "name": product["name"],
                "price": 1,  # deliberately wrong -- server must ignore this
                "quantity": 2,
                "size": "M",
                "image": "https://example.com/img.jpg"
            }],
            "subtotal": 1,  # deliberately wrong -- server must recompute
            "shipping": 12345,
            "total": 1,
            "payment_method": "COD"
        }
        r = s.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "order_number" in d
        assert d["order_number"].startswith("RE")
        assert d["status"] == "confirmed"
        assert isinstance(d["items"], list) and len(d["items"]) == 1
        assert d["items"][0]["price"] == product["price"], "server must use the DB price, not the client's"
        assert d["subtotal"] == expected_subtotal
        assert d["total"] == d["subtotal"] + d["shipping"]
        TestOrders.order_number = d["order_number"]

    def test_get_order_by_number(self, s):
        assert TestOrders.order_number, "prior test must create order"
        r = s.get(f"{API}/orders/{TestOrders.order_number}")
        assert r.status_code == 200
        d = r.json()
        assert d["order_number"] == TestOrders.order_number
        assert d["customer_name"] == "TEST_Priya Sharma"
        assert d["items"][0]["slug"] == "meher-maroon-kurti"

    def test_get_order_unknown_404(self, s):
        r = s.get(f"{API}/orders/REZZZZZZZZ")
        assert r.status_code == 404


# ---------- Subscribe ----------
class TestSubscribe:
    def test_subscribe_email_only(self, s):
        r = s.post(f"{API}/subscribe", json={"email": "TEST_sub1@example.com"})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == "TEST_sub1@example.com"
        assert "id" in d

    def test_subscribe_phone_only(self, s):
        r = s.post(f"{API}/subscribe", json={"phone": "9111111111"})
        assert r.status_code == 200
        d = r.json()
        assert d["phone"] == "9111111111"

    def test_subscribe_requires_email_or_phone(self, s):
        r = s.post(f"{API}/subscribe", json={})
        assert r.status_code == 400


# ---------- Contact ----------
class TestContact:
    def test_create_contact(self, s):
        payload = {
            "name": "TEST_Aisha",
            "email": "TEST_aisha@example.com",
            "phone": "9000000000",
            "message": "Hello, I have a question about size"
        }
        r = s.post(f"{API}/contact", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Aisha"
        assert d["email"] == "TEST_aisha@example.com"
        assert d["message"] == "Hello, I have a question about size"
        assert "id" in d
