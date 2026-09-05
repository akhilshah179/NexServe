"""
Test multi-user WebSocket communication and targeted notifications.
"""
import json
from datetime import datetime, timezone, timedelta


def test_user_specific_websocket_booking_notification(client, customer_token, provider_token, sample_service, provider_user, customer_user):
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    provider_headers = {"Authorization": f"Bearer {provider_token}"}

    # Connect provider to user socket
    with client.websocket_connect(f"/ws/user/{provider_user.id}") as provider_ws:
        # Send heartbeat ping
        provider_ws.send_text("ping")
        pong = provider_ws.receive_text()
        assert pong == "pong"

        # Customer books service with provider
        future_date = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
        payload = {
            "service_id": sample_service.id,
            "provider_id": provider_user.id,
            "booking_date": future_date,
            "time_slot": "10:00 AM - 11:00 AM",
            "notes": "Please bring deep cleaning equipment.",
        }
        res = client.post("/api/v1/bookings", json=payload, headers=customer_headers)
        assert res.status_code == 201
        booking_data = res.json()
        booking_id = booking_data["id"]

        # Provider receives the notification and booking update
        # 1. new_notification or booking_update event
        msg_raw = provider_ws.receive_text()
        msg = json.loads(msg_raw)
        assert msg["event"] in ["new_notification", "booking_created", "status_update"]
        assert msg["type"] in ["notification", "booking_update"]

        # Connect customer to user socket
        with client.websocket_connect(f"/ws/user/{customer_user.id}") as customer_ws:
            # Also connect to booking live tracker socket
            with client.websocket_connect(f"/ws/bookings/{booking_id}") as tracker_ws:
                # 1. Provider confirms booking
                res_conf = client.post(f"/api/v1/bookings/{booking_id}/confirm", headers=provider_headers)
                assert res_conf.status_code == 200

                # Customer socket receives status update or notification
                cust_msg = json.loads(customer_ws.receive_text())
                assert cust_msg.get("status") == "confirmed" or cust_msg.get("notification", {}).get("type") == "booking_confirmed" or cust_msg.get("event") in ["new_notification", "status_update"]

                # Tracker socket receives status update
                track_msg = json.loads(tracker_ws.receive_text())
                assert track_msg.get("status") == "confirmed"

                # 2. Provider marks On The Way
                res_otw = client.post(f"/api/v1/bookings/{booking_id}/on-the-way", headers=provider_headers)
                assert res_otw.status_code == 200

                # Customer receives "Provider On The Way"
                cust_otw_msg = json.loads(customer_ws.receive_text())
                assert cust_otw_msg.get("status") == "provider_on_the_way" or "Way" in cust_otw_msg.get("notification", {}).get("title", "") or cust_otw_msg.get("event") in ["new_notification", "status_update"]

                # 3. Provider starts service (IN_PROGRESS)
                res_start = client.post(f"/api/v1/bookings/{booking_id}/start", headers=provider_headers)
                assert res_start.status_code == 200

                # Customer receives in_progress
                cust_start_msg = json.loads(customer_ws.receive_text())
                assert cust_start_msg.get("status") == "in_progress" or "Progress" in cust_start_msg.get("notification", {}).get("title", "") or cust_start_msg.get("event") in ["new_notification", "status_update"]

                # 4. Provider completes service (COMPLETED)
                res_comp = client.post(f"/api/v1/bookings/{booking_id}/complete", headers=provider_headers)
                assert res_comp.status_code == 200

                # Customer receives completed
                cust_comp_msg = json.loads(customer_ws.receive_text())
                assert cust_comp_msg.get("status") == "completed" or "Completed" in cust_comp_msg.get("notification", {}).get("title", "") or cust_comp_msg.get("event") in ["new_notification", "status_update"]
