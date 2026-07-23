"""Backend API tests for the Phase 1 auth/RBAC layer. Follows the same
live-HTTP convention as backend_test.py -- point REACT_APP_BACKEND_URL (or
frontend/.env) at a running instance with a reachable MongoDB before running."""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
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


def _unique_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@example.com"


class TestRegisterAndLogin:
    email = None
    password = "Sup3rSecret!"
    access_token = None
    refresh_token = None

    def test_register_new_customer(self, s):
        TestRegisterAndLogin.email = _unique_email()
        r = s.post(f"{API}/auth/register", json={
            "name": "TEST Priya Sharma",
            "email": TestRegisterAndLogin.email,
            "password": TestRegisterAndLogin.password,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == TestRegisterAndLogin.email.lower()
        assert d["user"]["role"] == "customer"
        assert "password_hash" not in d["user"]
        assert d["access_token"] and d["refresh_token"]
        TestRegisterAndLogin.access_token = d["access_token"]
        TestRegisterAndLogin.refresh_token = d["refresh_token"]

    def test_register_duplicate_email_conflict(self, s):
        r = s.post(f"{API}/auth/register", json={
            "name": "TEST Duplicate",
            "email": TestRegisterAndLogin.email,
            "password": "AnotherPass1!",
        })
        assert r.status_code == 409

    def test_register_short_password_rejected(self, s):
        r = s.post(f"{API}/auth/register", json={
            "name": "TEST Weak",
            "email": _unique_email(),
            "password": "short",
        })
        assert r.status_code == 422

    def test_login_wrong_password_401(self, s):
        r = s.post(f"{API}/auth/login", json={"email": TestRegisterAndLogin.email, "password": "wrong"})
        assert r.status_code == 401

    def test_login_correct_credentials(self, s):
        r = s.post(f"{API}/auth/login", json={
            "email": TestRegisterAndLogin.email,
            "password": TestRegisterAndLogin.password,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        TestRegisterAndLogin.access_token = d["access_token"]
        TestRegisterAndLogin.refresh_token = d["refresh_token"]

    def test_me_with_valid_token(self, s):
        r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {TestRegisterAndLogin.access_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == TestRegisterAndLogin.email.lower()

    def test_me_without_token_401(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_garbage_token_401(self, s):
        r = s.get(f"{API}/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
        assert r.status_code == 401

    def test_customer_cannot_access_admin_products(self, s):
        r = s.get(f"{API}/admin/products", headers={"Authorization": f"Bearer {TestRegisterAndLogin.access_token}"})
        assert r.status_code == 403

    def test_refresh_rotates_token(self, s):
        r = s.post(f"{API}/auth/refresh", json={"refresh_token": TestRegisterAndLogin.refresh_token})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["access_token"] != TestRegisterAndLogin.access_token
        new_refresh = d["refresh_token"]

        # Old refresh token is single-use; replaying it must fail.
        replay = s.post(f"{API}/auth/refresh", json={"refresh_token": TestRegisterAndLogin.refresh_token})
        assert replay.status_code == 401

        TestRegisterAndLogin.access_token = d["access_token"]
        TestRegisterAndLogin.refresh_token = new_refresh

    def test_logout_revokes_refresh_token(self, s):
        r = s.post(f"{API}/auth/logout", json={"refresh_token": TestRegisterAndLogin.refresh_token})
        assert r.status_code == 200
        replay = s.post(f"{API}/auth/refresh", json={"refresh_token": TestRegisterAndLogin.refresh_token})
        assert replay.status_code == 401


class TestPasswordReset:
    def test_forgot_password_unknown_email_still_200(self, s):
        r = s.post(f"{API}/auth/forgot-password", json={"email": _unique_email()})
        assert r.status_code == 200

    def test_reset_password_invalid_token_400(self, s):
        r = s.post(f"{API}/auth/reset-password", json={"token": "not-a-real-token", "new_password": "NewPass123!"})
        assert r.status_code == 400
