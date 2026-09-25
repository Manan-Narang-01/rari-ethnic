"""Regression tests for the vulnerabilities found and fixed in the security
audit (see the audit report). Follows the same live-HTTP convention as
backend_auth_test.py -- point REACT_APP_BACKEND_URL at a running instance.
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    ses = requests.Session()
    ses.headers.update({"Content-Type": "application/json"})
    return ses


def _unique_email():
    return f"SECTEST_{uuid.uuid4().hex[:10]}@example.com"


def _admin_session():
    """Logs in with the seeded admin/super_admin from the environment.
    Skips (not fails) tests that need it when no admin credentials are
    configured for this environment -- there's no public way to create an
    admin account to test with otherwise."""
    email = os.environ.get("SUPER_ADMIN_EMAIL") or os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("SUPER_ADMIN_PASSWORD") or os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        pytest.skip("No admin credentials configured in this environment")
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        pytest.skip(f"Could not log in as configured admin ({r.status_code})")
    token = r.json()["access_token"]
    ses = requests.Session()
    ses.headers.update({"Authorization": f"Bearer {token}"})
    return ses


class TestDevLoginCannotHijackExistingAccounts:
    """CVE-worthy finding: AuthService.authenticate_dev used to log in AS an
    existing user by email alone (no password) whenever dev-login was
    enabled -- which is the *default* state whenever Google Sign-In isn't
    configured. Fixed to only ever create brand-new accounts."""

    def test_dev_login_either_disabled_or_cannot_reuse_a_real_account(self, s):
        email = _unique_email()
        # Create a real, password-protected account first.
        reg = s.post(f"{API}/auth/register", json={"name": "Sec Test", "email": email, "password": "Sup3rSecret!"})
        assert reg.status_code == 200, reg.text

        # Attempt to hijack it via dev-login using nothing but the email.
        r = s.post(f"{API}/customer/dev-login", json={"email": email})

        if r.status_code == 403:
            return  # dev-login disabled entirely in this environment -- also safe
        assert r.status_code != 200, (
            "SECURITY REGRESSION: dev-login authenticated as an existing "
            "account without a password -- account-takeover vulnerability is back."
        )
        assert r.status_code == 409, r.text

    def test_dev_login_can_still_create_a_brand_new_test_account(self, s):
        email = _unique_email()
        r = s.post(f"{API}/customer/dev-login", json={"email": email})
        if r.status_code == 403:
            pytest.skip("Dev login disabled in this environment")
        assert r.status_code == 200, r.text
        assert r.json()["customer"]["email"] == email.lower()


class TestUploadRejectsSpoofedImages:
    """Finding: the upload endpoint trusted the filename extension and the
    client-supplied Content-Type header, neither of which prove the bytes are
    actually an image -- a non-image file renamed to `x.jpg` would be stored
    and later served back with an image Content-Type."""

    def test_rejects_non_image_bytes_with_image_extension(self):
        admin = _admin_session()
        r = admin.post(f"{API}/admin/upload", files={"file": ("fake.jpg", b"<script>not an image</script>", "image/jpeg")})
        assert r.status_code == 400, r.text

    def test_accepts_a_real_image(self):
        admin = _admin_session()
        real_png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000a49444154789c6360000002000100dd8d3d7c0000000049454e44ae426082"
        )
        r = admin.post(f"{API}/admin/upload", files={"file": ("real.png", real_png, "image/png")})
        assert r.status_code == 200, r.text
        assert r.json()["path"].endswith(".png")


class TestSecurityHeaders:
    def test_baseline_headers_present(self, s):
        r = s.get(f"{API}/")
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        assert r.headers.get("X-Frame-Options") == "DENY"
        assert "Referrer-Policy" in r.headers
