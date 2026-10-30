"""
Production Readiness, Security, and Dual-Role Acceptance Tests for NexServe.

Validates:
1. Dual-role capabilities: Single user identity as Customer AND Provider.
2. Provider lifecycle: Apply -> Pending -> Approved -> Suspended -> Customer access preserved.
3. Concurrency & duplicate prevention: Double-booking prevention with HTTP 409 Conflict.
4. Self-booking prevention.
5. Server-side authorization & IDOR protection.
6. 15% Platform commission validation.
7. Database health check.
"""

from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from app.models.user import User, UserRole, VerificationStatus
from app.models.rental import RentalCategory, RentalItem, RentalBooking, RentalBookingStatus
from app.models.service import Category, Service
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus
from app.core.config import settings


def test_customer_applies_to_become_provider(client, db_session, customer_user, customer_token, sample_service):
    # 1. Customer has an existing booking
    existing_booking = Booking(
        customer_id=customer_user.id,
        provider_id=sample_service.provider_id,
        service_id=sample_service.id,
        booking_date=datetime.now(timezone.utc) + timedelta(days=5),
        time_slot="10:00 AM - 11:00 AM",
        status=BookingStatus.CONFIRMED,
        total_amount=150.0,
    )
    db_session.add(existing_booking)
    db_session.commit()

    headers = {"Authorization": f"Bearer {customer_token}"}

    # 2. Customer applies to become provider
    apply_payload = {
        "business_name": "Test Customer Solutions",
        "category_id": sample_service.category_id,
        "hourly_rate": 80.0,
        "bio": "Experienced professional providing quality home repairs."
    }
    res = client.post("/api/v1/providers/apply", json=apply_payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["is_provider"] is True
    assert data["verification_status"] == "pending"

    # 3. Verify single user record (no duplicates created)
    users = db_session.query(User).filter(User.email == customer_user.email).all()
    assert len(users) == 1
    updated_user = users[0]
    assert updated_user.id == customer_user.id
    assert updated_user.is_provider is True
    assert updated_user.verification_status == VerificationStatus.PENDING

    # 4. Verify existing customer booking history is 100% intact
    my_bookings = client.get("/api/v1/bookings/my", headers=headers)
    assert my_bookings.status_code == 200
    booking_ids = [b["id"] for b in my_bookings.json()]
    assert existing_booking.id in booking_ids


def test_pending_provider_restricted_from_publishing(client, db_session, customer_user, customer_token, sample_service):
    # Set customer to pending provider
    customer_user.is_provider = True
    customer_user.verification_status = VerificationStatus.PENDING
    db_session.commit()

    headers = {"Authorization": f"Bearer {customer_token}"}

    # Cannot publish new service
    service_payload = {
        "title": "Pending Cleaning",
        "description": "Clean house",
        "price": 200.0,
        "duration_minutes": 60,
        "category_id": sample_service.category_id,
    }
    res_svc = client.post("/api/v1/services", json=service_payload, headers=headers)
    assert res_svc.status_code == 403
    assert "pending" in res_svc.json()["detail"].lower()

    # Cannot list rental items
    rental_cat = RentalCategory(name="Tools", slug="tools-pending", description="Tools Category")
    db_session.add(rental_cat)
    db_session.commit()

    rental_payload = {
        "name": "Drill Machine",
        "title": "Drill Machine",
        "description": "Heavy duty drill",
        "category_id": rental_cat.id,
        "brand": "Bosch",
        "model": "GSB 500",
        "daily_rate": 250.0,
        "price_per_day": 250.0,
        "security_deposit": 1000.0,
        "quantity": 1,
        "city": "Mumbai",
    }
    res_rent = client.post("/api/v1/rentals/items", json=rental_payload, headers=headers)
    assert res_rent.status_code == 403


def test_admin_approves_provider_and_enables_dual_capabilities(client, db_session, admin_token, customer_user, customer_token, sample_service):
    # Customer applied
    customer_user.is_provider = True
    customer_user.verification_status = VerificationStatus.PENDING
    db_session.commit()

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    customer_headers = {"Authorization": f"Bearer {customer_token}"}

    # Admin approves provider
    res_approve = client.post(
        f"/api/v1/admin/providers/{customer_user.id}/approve",
        headers=admin_headers
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["verification_status"] == "approved"

    # Now user can publish services as a provider!
    service_payload = {
        "title": "Master Carpentry",
        "description": "Woodwork and repairs",
        "price": 300.0,
        "duration_minutes": 90,
        "category_id": sample_service.category_id,
    }
    res_svc = client.post("/api/v1/services", json=service_payload, headers=customer_headers)
    assert res_svc.status_code == 201

    # And the same user can STILL book other providers as a customer!
    future_date = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%d")
    book_payload = {
        "service_id": sample_service.id,
        "provider_id": sample_service.provider_id,
        "booking_date": future_date,
        "time_slot": "02:00 PM - 03:00 PM",
        "notes": "Booking another professional for my home.",
    }
    res_book = client.post("/api/v1/bookings", json=book_payload, headers=customer_headers)
    assert res_book.status_code == 201


def test_provider_can_rent_items_from_other_providers(client, db_session, provider_user, provider_token, customer_user):
    # Create another provider with rental item
    other_provider = User(
        email="lender@example.com",
        full_name="Rental Lender",
        google_id="google-lender-1",
        role=UserRole.PROVIDER,
        is_provider=True,
        verification_status=VerificationStatus.APPROVED,
        is_active=True,
    )
    db_session.add(other_provider)
    rental_cat = RentalCategory(name="Ladders", slug="ladders", description="Ladders Category")
    db_session.add(rental_cat)
    db_session.commit()

    item = RentalItem(
        provider_id=other_provider.id,
        category_id=rental_cat.id,
        name="12ft Aluminum Ladder",
        title="12ft Aluminum Ladder",
        description="High grade aluminum ladder",
        price_per_day=200.0,
        daily_rate=200.0,
        security_deposit=1000.0,
        quantity=1,
        city="Mumbai",
        is_active=True,
    )
    db_session.add(item)
    db_session.commit()

    # Provider 1 rents ladder from Provider 2
    headers = {"Authorization": f"Bearer {provider_token}"}
    start_d = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
    end_d = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%Y-%m-%d")

    payload = {
        "rental_item_id": item.id,
        "start_date": start_d,
        "end_date": end_d,
        "fulfillment_type": "PICKUP",
        "notes": "Need ladder for weekend job",
    }
    res = client.post("/api/v1/rentals/bookings", json=payload, headers=headers)
    assert res.status_code in [200, 201]
    booking_data = res.json()
    assert booking_data["customer_id"] == provider_user.id
    assert booking_data["provider_id"] == other_provider.id


def test_self_booking_prevention(client, provider_token, sample_service, provider_user):
    # Provider cannot book their own service
    headers = {"Authorization": f"Bearer {provider_token}"}
    future_date = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%Y-%m-%d")
    res = client.post("/api/v1/bookings", json={
        "service_id": sample_service.id,
        "provider_id": provider_user.id,
        "booking_date": future_date,
        "time_slot": "10:00 AM - 11:00 AM",
        "notes": "Attempting self booking",
    }, headers=headers)
    assert res.status_code == 400
    assert "cannot book your own" in res.json()["detail"].lower()


def test_admin_suspends_provider_preserves_customer_capabilities(client, db_session, admin_token, provider_user, provider_token, sample_service):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    provider_headers = {"Authorization": f"Bearer {provider_token}"}

    # 1. Admin suspends provider
    res_suspend = client.post(
        f"/api/v1/admin/providers/{provider_user.id}/suspend",
        headers=admin_headers
    )
    assert res_suspend.status_code == 200
    assert res_suspend.json()["verification_status"] == "suspended"

    # 2. Suspended provider cannot list new services
    res_svc = client.post("/api/v1/services", json={
        "title": "Blocked Service",
        "description": "Should fail",
        "price": 100.0,
        "duration_minutes": 60,
        "category_id": sample_service.category_id,
    }, headers=provider_headers)
    assert res_svc.status_code == 403
    assert "suspended" in res_svc.json()["detail"].lower()

    # 3. Provider's own services are deactivated
    db_session.refresh(sample_service)
    assert sample_service.is_active is False

    # 4. But the person can STILL book another active provider's service as a customer!
    other_prov = User(
        email="activeprov@example.com",
        full_name="Active Provider",
        google_id="google-active-prov-1",
        role=UserRole.PROVIDER,
        is_provider=True,
        verification_status=VerificationStatus.APPROVED,
        is_active=True,
    )
    db_session.add(other_prov)
    db_session.commit()
    other_svc = Service(
        title="Plumbing Repairs",
        description="Fix leaks and pipes",
        price=180.0,
        duration_minutes=60,
        category_id=sample_service.category_id,
        provider_id=other_prov.id,
        is_active=True,
    )
    db_session.add(other_svc)
    db_session.commit()

    future_date = (datetime.now(timezone.utc) + timedelta(days=6)).strftime("%Y-%m-%d")
    res_book_other = client.post("/api/v1/bookings", json={
        "service_id": other_svc.id,
        "provider_id": other_prov.id,
        "booking_date": future_date,
        "time_slot": "04:00 PM - 05:00 PM",
        "notes": "Booking active provider's service while my own provider profile is suspended.",
    }, headers=provider_headers)
    assert res_book_other.status_code == 201


def test_double_booking_prevention_on_same_slot(client, customer_token, other_customer_token, sample_service, provider_user):
    future_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    slot = "09:00 AM - 10:00 AM"

    payload = {
        "service_id": sample_service.id,
        "provider_id": provider_user.id,
        "booking_date": future_date,
        "time_slot": slot,
        "notes": "First reservation",
    }

    # 1. Customer 1 books the slot
    res1 = client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {customer_token}"})
    assert res1.status_code == 201

    # 2. Customer 2 tries to reserve the identical slot for the same provider
    res2 = client.post("/api/v1/bookings", json=payload, headers={"Authorization": f"Bearer {other_customer_token}"})
    assert res2.status_code in [400, 409]
    assert "not available" in res2.json()["detail"].lower() or "already" in res2.json()["detail"].lower()


def test_idor_protection_on_attachments(client, other_customer_token, pending_booking):
    # Customer 2 attempts to upload attachment to Customer 1's booking
    headers_cust2 = {"Authorization": f"Bearer {other_customer_token}"}
    files = [("files", ("photo.jpg", b"fake image bytes", "image/jpeg"))]
    data = {"booking_id": str(pending_booking.id)}

    res = client.post(
        "/api/v1/attachments/upload",
        files=files,
        data=data,
        headers=headers_cust2,
    )
    assert res.status_code == 403
    assert "not authorized" in res.json()["detail"].lower()


def test_fifteen_percent_platform_commission(client, db_session, customer_token, pending_booking, monkeypatch):
    # Mock Razorpay keys
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_commission_key")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "rzp_test_commission_secret")

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {"id": "order_commission_12345"}

    with patch("requests.post", return_value=fake_response):
        headers = {"Authorization": f"Bearer {customer_token}"}
        res = client.post(
            "/api/v1/payments/orders",
            json={"booking_id": pending_booking.id},
            headers=headers
        )
        assert res.status_code == 201
        data = res.json()
        assert data["amount"] == 15000  # 150.0 total_amount * 100 paise

        # Check in db_session that platform_commission_paise is 15% of 15000 paise = 2250 paise
        payment = db_session.query(Payment).filter(Payment.razorpay_order_id == "order_commission_12345").first()
        assert payment is not None
        assert payment.platform_commission_paise == 2250


def test_database_health_check(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
