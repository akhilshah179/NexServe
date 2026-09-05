"""
Test suite for the NexServe Rental Marketplace module.

Tests cover:
- Rental Category & Item CRUD
- Live Date Overlap Conflict Detection
- Dynamic Price & Security Deposit Calculation
- Rental Booking Creation & Security Deposit Escrow Tracking
- Razorpay Rental Order & Verification
- Full Rental Lifecycle State Transitions
- Clean Return & 100% Security Deposit Refund
- Damage Claim Creation & Admin Escrow Arbitration
- Customer Reviews & Ratings
"""

from datetime import date, timedelta
import pytest
from app.models.rental import (
    RentalCategory,
    RentalItem,
    RentalBooking,
    RentalBookingStatus,
    SecurityDeposit,
    SecurityDepositStatus,
    DamageClaim,
    DamageClaimStatus,
)
from app.services.rental_seed_service import seed_default_rentals


@pytest.fixture
def seeded_rentals(db_session, provider_user):
    """Seed categories and items for rental tests."""
    return seed_default_rentals(db_session)



@pytest.fixture
def sample_rental_item(db_session, provider_user):
    """Create a sample rental item for isolated testing."""
    cat = RentalCategory(
        name="Cameras & Photography",
        slug="cameras-photography",
        icon_url="📷",
        description="Cinema cameras and lenses",
    )
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    item = RentalItem(
        title="Sony FX3 Full-Frame Cinema Camera",
        description="Includes 2x batteries, 160GB CFexpress card, cage and top handle.",
        category_id=cat.id,
        provider_id=provider_user.id,
        brand="Sony",
        model="FX3",
        daily_rate=2500.0,
        security_deposit=10000.0,
        quantity=2,
        min_rental_days=1,
        max_rental_days=14,
        delivery_available=True,
        delivery_fee=200.0,
        pickup_available=True,
        pickup_address="Studio 404, Bandra West, Mumbai",
        city="Mumbai",
        is_active=True,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


def test_rental_categories_list(client, seeded_rentals):
    """Test retrieving rental categories."""
    response = client.get("/api/v1/rentals/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 10
    slugs = [c["slug"] for c in data]
    assert "vehicles" in slugs
    assert "cameras-photography" in slugs
    assert "electronics" in slugs
    assert "camping-outdoor" in slugs


def test_rental_items_catalog_and_filter(client, seeded_rentals):
    """Test listing rental items with search and category filters."""
    response = client.get("/api/v1/rentals/items?category_slug=cameras-photography")
    assert response.status_code == 200
    items = response.json()
    assert len(items) > 0
    for it in items:
        assert it["category"]["slug"] == "cameras-photography"
        assert it["daily_rate"] > 0
        assert it["security_deposit"] > 0


def test_provider_create_and_delete_rental_item(client, provider_token, sample_rental_item, db_session):
    """Test provider listing a new rental item and deleting it."""
    headers = {"Authorization": f"Bearer {provider_token}"}
    payload = {
        "title": "Aputure 300d II LED Light Kit",
        "description": "Powerful 5500K daylight LED light with reflector and light stand.",
        "category_id": sample_rental_item.category_id,
        "brand": "Aputure",
        "model": "300d II",
        "daily_rate": 800.0,
        "security_deposit": 3000.0,
        "quantity": 3,
        "min_rental_days": 1,
        "max_rental_days": 7,
        "delivery_available": True,
        "delivery_fee": 150.0,
        "pickup_available": True,
        "pickup_address": "Indiranagar, Bangalore",
        "city": "Bengaluru",
        "images": [{"image_url": "https://images.unsplash.com/photo-lighting", "is_primary": True}],
    }
    create_res = client.post("/api/v1/rentals/items", json=payload, headers=headers)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["title"] == payload["title"]
    assert created["daily_rate"] == 800.0
    assert created["security_deposit"] == 3000.0

    # Delete item
    del_res = client.delete(f"/api/v1/rentals/items/{created['id']}", headers=headers)
    assert del_res.status_code == 200


def test_rental_price_calculation_and_quote(client, sample_rental_item):
    """Test transparent price calculation: subtotal + delivery + separate deposit."""
    start = date.today() + timedelta(days=2)
    end = start + timedelta(days=2)  # 3 rental days (inclusive start & end: day 0, 1, 2)

    payload = {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "quantity": 1,
        "delivery_requested": True,
    }
    res = client.post(f"/api/v1/rentals/items/{sample_rental_item.id}/calculate-price", json=payload)
    assert res.status_code == 200
    quote = res.json()

    assert quote["days"] == 3
    assert quote["daily_rate"] == 2500.0
    assert quote["subtotal"] == 7500.0  # 3 days * 2500
    assert quote["delivery_fee"] == 200.0
    assert quote["security_deposit_amount"] == 10000.0
    # Total charged = subtotal (7500) + delivery (200) + deposit (10000) = 17700
    assert quote["total_amount_charged"] == 17700.0


def test_rental_booking_overlap_availability(client, sample_rental_item, customer_token, db_session):
    """Test strict overlap conflict prevention for rental dates."""
    headers = {"Authorization": f"Bearer {customer_token}"}
    start = date.today() + timedelta(days=5)
    end = start + timedelta(days=3)

    # Initial availability check -> should be available
    avail_res = client.post(
        f"/api/v1/rentals/items/{sample_rental_item.id}/availability",
        json={"start_date": start.isoformat(), "end_date": end.isoformat(), "quantity": 2},
    )
    assert avail_res.status_code == 200
    assert avail_res.json()["is_available"] is True

    # Book all 2 units for these dates
    booking_payload = {
        "rental_item_id": sample_rental_item.id,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "quantity": 2,
        "fulfillment_type": "DELIVERY",
        "delivery_address": "Flat 202, Palm Beach Road, Navi Mumbai",
    }
    book_res = client.post("/api/v1/rentals/bookings", json=booking_payload, headers=headers)
    assert book_res.status_code == 200
    booking = book_res.json()
    assert booking["status"] == "REQUESTED"
    assert booking["security_deposit_amount"] == 10000.0

    # Availability check for overlapping dates now -> should fail (0 units available)
    overlap_res = client.post(
        f"/api/v1/rentals/items/{sample_rental_item.id}/availability",
        json={"start_date": (start + timedelta(days=1)).isoformat(), "end_date": (end + timedelta(days=1)).isoformat(), "quantity": 1},
    )
    assert overlap_res.status_code == 200
    assert overlap_res.json()["is_available"] is False


def test_rental_payment_razorpay_flow(client, sample_rental_item, customer_token, db_session):
    """Test Razorpay order generation and payment verification for rentals."""
    headers = {"Authorization": f"Bearer {customer_token}"}
    start = date.today() + timedelta(days=10)
    end = start + timedelta(days=1)

    # Create booking
    booking_payload = {
        "rental_item_id": sample_rental_item.id,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "quantity": 1,
        "fulfillment_type": "PICKUP",
    }
    book_res = client.post("/api/v1/rentals/bookings", json=booking_payload, headers=headers)
    assert book_res.status_code == 200
    booking_id = book_res.json()["id"]

    # 1. Create Razorpay Payment Order
    order_res = client.post("/api/v1/payments/rentals/orders", json={"rental_booking_id": booking_id}, headers=headers)
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["amount"] > 0
    assert "razorpay_order_id" in order_data

    # 2. Verify Payment (using demo key signature verification)
    verify_res = client.post(
        "/api/v1/payments/rentals/verify",
        json={
            "rental_booking_id": booking_id,
            "razorpay_order_id": order_data["razorpay_order_id"],
            "razorpay_payment_id": f"pay_test_{booking_id}",
            "razorpay_signature": "demo_signature",
        },
        headers=headers,
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["verified"] is True
    assert verify_data["booking_status"] == "CONFIRMED"


def test_rental_clean_return_and_deposit_refund(client, sample_rental_item, customer_token, provider_token, db_session):
    """Test full rental lifecycle to clean return and automatic security deposit refund."""
    cust_headers = {"Authorization": f"Bearer {customer_token}"}
    prov_headers = {"Authorization": f"Bearer {provider_token}"}

    start = date.today() + timedelta(days=15)
    end = start + timedelta(days=2)

    # 1. Customer Books
    booking_payload = {
        "rental_item_id": sample_rental_item.id,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "quantity": 1,
        "fulfillment_type": "PICKUP",
    }
    book_res = client.post("/api/v1/rentals/bookings", json=booking_payload, headers=cust_headers)
    booking_id = book_res.json()["id"]

    # 2. Provider Confirms Booking
    client.patch(
        f"/api/v1/rentals/bookings/{booking_id}/status",
        json={"status": "CONFIRMED", "notes": "Host approved reservation"},
        headers=prov_headers,
    )

    # 3. Provider Marks Ready For Pickup
    client.patch(
        f"/api/v1/rentals/bookings/{booking_id}/status",
        json={"status": "READY_FOR_PICKUP", "notes": "Item packed in studio"},
        headers=prov_headers,
    )

    # 4. Host confirms customer handover (RENTED)
    client.patch(
        f"/api/v1/rentals/bookings/{booking_id}/status",
        json={"status": "RENTED", "notes": "Customer picked up camera"},
        headers=prov_headers,
    )

    # 5. Customer initiates return (RETURN_PENDING)
    client.patch(
        f"/api/v1/rentals/bookings/{booking_id}/status",
        json={"status": "RETURN_PENDING", "notes": "Handing item back to host"},
        headers=cust_headers,
    )

    # 6. Host inspects clean item -> process return
    return_payload = {
        "item_condition": "EXCELLENT",
        "is_damaged": False,
        "damage_deduction_paise": 0,
        "inspection_notes": "Camera returned spotless with all accessories.",
    }
    return_res = client.post(f"/api/v1/rentals/bookings/{booking_id}/return", json=return_payload, headers=prov_headers)
    assert return_res.status_code == 200
    returned_booking = return_res.json()
    assert returned_booking["status"] == "COMPLETED"
    assert returned_booking["security_deposit"]["status"] == "REFUNDED"


def test_rental_damage_claim_arbitration(client, sample_rental_item, customer_token, provider_token, admin_token, db_session):
    """Test damage claim filing by provider and arbitration by admin."""
    cust_headers = {"Authorization": f"Bearer {customer_token}"}
    prov_headers = {"Authorization": f"Bearer {provider_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    start = date.today() + timedelta(days=20)
    end = start + timedelta(days=2)

    # Create & advance booking to RENTED
    book_res = client.post(
        "/api/v1/rentals/bookings",
        json={
            "rental_item_id": sample_rental_item.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "quantity": 1,
            "fulfillment_type": "PICKUP",
        },
        headers=cust_headers,
    )
    booking_id = book_res.json()["id"]

    client.patch(f"/api/v1/rentals/bookings/{booking_id}/status", json={"status": "CONFIRMED"}, headers=prov_headers)
    client.patch(f"/api/v1/rentals/bookings/{booking_id}/status", json={"status": "RENTED"}, headers=prov_headers)

    # Provider files damage claim
    claim_payload = {
        "damage_description": "Front optical element has deep scratch and cage corner is bent.",
        "estimated_repair_cost": 4500.0,
    }
    claim_res = client.post(f"/api/v1/rentals/bookings/{booking_id}/damage-claim", json=claim_payload, headers=prov_headers)
    assert claim_res.status_code == 200
    claim_data = claim_res.json()
    assert claim_data["status"] == "PENDING"
    assert claim_data["estimated_repair_cost"] == 4500.0

    # Admin reviews and approves deduction
    claim_id = claim_data["id"]
    admin_review_payload = {
        "status": "APPROVED",
        "approved_deduction_amount": 4500.0,
        "admin_notes": "Damage verified via photos and repair center invoice.",
    }
    review_res = client.patch(f"/api/v1/rentals/damage-claims/{claim_id}", json=admin_review_payload, headers=admin_headers)
    assert review_res.status_code == 200
    reviewed_claim = review_res.json()
    assert reviewed_claim["status"] == "APPROVED"
    assert reviewed_claim["approved_deduction_amount"] == 4500.0


def test_customer_create_rental_review(client, sample_rental_item, customer_token):
    """Test customer submitting rating and review for a rental item."""
    headers = {"Authorization": f"Bearer {customer_token}"}
    review_payload = {
        "rating": 5,
        "comment": "Outstanding camera kit! Provider was punctual and included extra batteries.",
    }
    res = client.post(f"/api/v1/rentals/items/{sample_rental_item.id}/reviews", json=review_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["rating"] == 5
    assert data["comment"] == review_payload["comment"]
