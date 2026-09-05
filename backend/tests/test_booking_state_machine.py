"""
Unit tests for Booking Lifecycle State Machine and Conflict Prevention.
"""
from datetime import datetime, timezone


def test_booking_confirm_and_complete_flow(client, provider_token, pending_booking):
    headers = {"Authorization": f"Bearer {provider_token}"}

    # 1. Provider confirms pending booking
    res_conf = client.post(f"/api/v1/bookings/{pending_booking.id}/confirm", headers=headers)
    assert res_conf.status_code == 200
    assert res_conf.json()["status"] == "confirmed"

    # 2. Provider completes confirmed booking
    res_comp = client.post(f"/api/v1/bookings/{pending_booking.id}/complete", headers=headers)
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "completed"


def test_double_booking_prevention(client, customer_token, sample_service, pending_booking):
    headers = {"Authorization": f"Bearer {customer_token}"}

    # Attempt to book exact same provider, date, and slot
    payload = {
        "service_id": sample_service.id,
        "booking_date": pending_booking.booking_date.isoformat(),
        "time_slot": pending_booking.time_slot,
    }

    res = client.post("/api/v1/bookings", json=payload, headers=headers)
    assert res.status_code == 409
    assert "already booked" in res.json()["detail"]



from datetime import datetime, timezone, timedelta


def test_reschedule_booking(client, customer_token, pending_booking):
    headers = {"Authorization": f"Bearer {customer_token}"}
    future_date = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")
    payload = {
        "new_booking_date": future_date,
        "new_time_slot": "02:00 PM - 03:00 PM",
    }
    res = client.post(f"/api/v1/bookings/{pending_booking.id}/reschedule", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["time_slot"] == "02:00 PM - 03:00 PM"
    assert res.json()["rescheduled_from_date"] is not None

