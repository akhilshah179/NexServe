"""
Tests for Razorpay Payments endpoints (order creation, authorization, signature verification, webhook signature validation).
"""

import hashlib
import hmac
import json
from unittest.mock import patch, MagicMock
import pytest
from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus


def test_create_order_unconfigured(client, customer_token, pending_booking, monkeypatch):
    """Test HTTP 503 when Razorpay is not configured."""
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "")
    headers = {"Authorization": f"Bearer {customer_token}"}
    response = client.post("/api/v1/payments/orders", json={"booking_id": pending_booking.id}, headers=headers)
    assert response.status_code == 503


def test_create_order_unauthorized_other_customer(client, other_customer_token, pending_booking, monkeypatch):
    """Test HTTP 403 when a user tries to create a payment order for another user's booking."""
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "rzp_test_secret")
    headers = {"Authorization": f"Bearer {other_customer_token}"}
    response = client.post("/api/v1/payments/orders", json={"booking_id": pending_booking.id}, headers=headers)
    assert response.status_code == 403
    assert "Not authorized" in response.json()["detail"]


def test_create_order_cancelled_booking(client, customer_token, cancelled_booking, monkeypatch):
    """Test HTTP 400 when attempting to pay for a cancelled booking."""
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "rzp_test_secret")
    headers = {"Authorization": f"Bearer {customer_token}"}
    response = client.post("/api/v1/payments/orders", json={"booking_id": cancelled_booking.id}, headers=headers)
    assert response.status_code == 400
    assert "Cancelled" in response.json()["detail"]


def test_create_order_confirmed_booking(client, db_session, customer_token, pending_booking, monkeypatch):
    """Test HTTP 400 when attempting to pay for an already confirmed booking."""
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "rzp_test_secret")
    pending_booking.status = BookingStatus.CONFIRMED
    db_session.commit()

    headers = {"Authorization": f"Bearer {customer_token}"}
    response = client.post("/api/v1/payments/orders", json={"booking_id": pending_booking.id}, headers=headers)
    assert response.status_code == 400
    assert "already paid" in response.json()["detail"].lower()


def test_create_order_success(client, customer_token, pending_booking, monkeypatch):
    """Test successful order creation calculates amount in integer paise and returns public Key ID."""
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "rzp_test_secret")

    fake_razorpay_response = MagicMock()
    fake_razorpay_response.status_code = 200
    fake_razorpay_response.json.return_value = {"id": "order_test_12345"}

    with patch("requests.post", return_value=fake_razorpay_response) as mock_post:
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = client.post("/api/v1/payments/orders", json={"booking_id": pending_booking.id}, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["razorpay_order_id"] == "order_test_12345"
        assert data["amount"] == 15000  # 150.0 total_amount * 100 integer paise
        assert data["currency"] == "INR"
        assert data["key_id"] == "rzp_test_key"
        assert data["booking_id"] == pending_booking.id


def test_verify_payment_invalid_signature(client, db_session, customer_token, pending_booking, monkeypatch):
    """Test HTTP 400 when verifying payment with an invalid signature."""
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "secret_key_123")

    payment = Payment(
        booking_id=pending_booking.id,
        razorpay_order_id="order_12345",
        amount_paise=15000,
        currency="INR",
        status=PaymentStatus.CREATED,
    )
    db_session.add(payment)
    db_session.commit()

    headers = {"Authorization": f"Bearer {customer_token}"}
    response = client.post(
        "/api/v1/payments/verify",
        json={
            "razorpay_order_id": "order_12345",
            "razorpay_payment_id": "pay_99999",
            "razorpay_signature": "invalid_signature_hex",
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert "signature verification failed" in response.json()["detail"].lower()


def test_verify_payment_valid_signature(client, db_session, customer_token, pending_booking, monkeypatch):
    """Test successful signature verification updates payment status to VERIFIED."""
    key_secret = "secret_key_123"
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", key_secret)

    order_id = "order_12345"
    payment_id = "pay_99999"

    payment = Payment(
        booking_id=pending_booking.id,
        razorpay_order_id=order_id,
        amount_paise=15000,
        currency="INR",
        status=PaymentStatus.CREATED,
    )
    db_session.add(payment)
    db_session.commit()

    # Calculate valid HMAC-SHA256 signature
    valid_signature = hmac.new(
        key_secret.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    headers = {"Authorization": f"Bearer {customer_token}"}
    response = client.post(
        "/api/v1/payments/verify",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_signature,
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "verified"
    assert data["razorpay_payment_id"] == payment_id

    # Verify DB state
    db_payment = db_session.query(Payment).filter(Payment.razorpay_order_id == order_id).first()
    assert db_payment.status == PaymentStatus.VERIFIED


def test_webhook_invalid_signature(client, monkeypatch):
    """Test HTTP 400 when Razorpay webhook fails HMAC signature validation."""
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "webhook_secret_xyz")

    payload = json.dumps({"event": "payment.captured", "payload": {}}).encode("utf-8")
    headers = {"X-Razorpay-Signature": "bad_signature"}
    response = client.post("/api/v1/payments/webhook", content=payload, headers=headers)
    assert response.status_code == 400
    assert "Invalid webhook signature" in response.json()["detail"]


def test_webhook_captured_event(client, db_session, pending_booking, monkeypatch):
    """Test valid payment.captured webhook updates payment status to CAPTURED and booking to CONFIRMED."""
    webhook_secret = "webhook_secret_xyz"
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", webhook_secret)

    order_id = "order_webhook_1"
    payment = Payment(
        booking_id=pending_booking.id,
        razorpay_order_id=order_id,
        amount_paise=15000,
        currency="INR",
        status=PaymentStatus.CREATED,
    )
    db_session.add(payment)
    db_session.commit()

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook_99",
                    "order_id": order_id,
                    "amount": 15000,
                    "status": "captured",
                }
            }
        },
    }
    raw_body = json.dumps(webhook_payload).encode("utf-8")
    valid_signature = hmac.new(webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()

    headers = {"X-Razorpay-Signature": valid_signature, "Content-Type": "application/json"}
    response = client.post("/api/v1/payments/webhook", content=raw_body, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    # Check payment and booking in DB
    db_session.refresh(payment)
    db_session.refresh(pending_booking)
    assert payment.status == PaymentStatus.CAPTURED
    assert pending_booking.status == BookingStatus.CONFIRMED
