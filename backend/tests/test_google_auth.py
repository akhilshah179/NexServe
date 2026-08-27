"""
Tests for Google OAuth Authentication Endpoint and Verification Logic.
"""

from unittest.mock import patch
import pytest
from app.core.config import settings
from app.models.user import User, UserRole


def test_google_auth_unconfigured(client, monkeypatch):
    """Test HTTP 503 when GOOGLE_CLIENT_ID is not configured."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
    response = client.post("/api/v1/auth/google", json={"credential": "some-token", "role": "customer"})
    assert response.status_code == 503
    assert "Google sign-in is not configured" in response.json()["detail"]


def test_google_auth_invalid_token_signature(client, monkeypatch):
    """Test HTTP 401 when Google token verification fails (signature/exp/aud invalid)."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    with patch("app.services.google_auth_service.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.side_effect = ValueError("Invalid token signature")
        response = client.post("/api/v1/auth/google", json={"credential": "invalid-token", "role": "customer"})
        assert response.status_code == 401
        assert "verification failed" in response.json()["detail"]


def test_google_auth_wrong_issuer(client, monkeypatch):
    """Test HTTP 401 when Google token has an untrusted issuer."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    with patch("app.services.google_auth_service.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "123456",
            "email": "user@example.com",
            "email_verified": True,
            "iss": "https://untrusted-issuer.com",
        }
        response = client.post("/api/v1/auth/google", json={"credential": "fake-token", "role": "customer"})
        assert response.status_code == 401
        assert "Invalid Google token issuer" in response.json()["detail"]


def test_google_auth_unverified_email(client, monkeypatch):
    """Test HTTP 401 when Google email is not verified."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    with patch("app.services.google_auth_service.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "123456",
            "email": "user@example.com",
            "email_verified": False,
            "iss": "https://accounts.google.com",
        }
        response = client.post("/api/v1/auth/google", json={"credential": "fake-token", "role": "customer"})
        assert response.status_code == 401
        assert "email is not verified" in response.json()["detail"]


def test_google_auth_new_user_success(client, db_session, monkeypatch):
    """Test successful Google auth creates new user with selected role and returns JWT."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    with patch("app.services.google_auth_service.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "google-user-999",
            "email": "new.google.user@example.com",
            "name": "New Google User",
            "picture": "https://picture.url/avatar.jpg",
            "email_verified": True,
            "iss": "https://accounts.google.com",
        }
        response = client.post("/api/v1/auth/google", json={"credential": "valid-token", "role": "provider"})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "new.google.user@example.com"
        assert data["user"]["role"] == "provider"

        # Check DB user role was set
        user = db_session.query(User).filter(User.email == "new.google.user@example.com").first()
        assert user is not None
        assert user.role == UserRole.PROVIDER


def test_google_auth_existing_user_preserves_role(client, db_session, customer_user, monkeypatch):
    """Test that logging in an existing user via Google preserves their existing role regardless of selected_role."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    with patch("app.services.google_auth_service.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": customer_user.google_id,
            "email": customer_user.email,
            "name": customer_user.full_name,
            "email_verified": True,
            "iss": "accounts.google.com",
        }
        # Pass role="provider" in request, but user is already a customer
        response = client.post("/api/v1/auth/google", json={"credential": "valid-token", "role": "provider"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "customer"  # Preserved original role!


def test_google_auth_demo_token_success(client, db_session, monkeypatch):
    """Test demo token login in DEBUG mode."""
    monkeypatch.setattr(settings, "DEBUG", True)
    response = client.post("/api/v1/auth/google", json={"credential": "demo-customer", "role": "customer"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "demo.customer@nexserve.com"

