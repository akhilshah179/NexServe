"""
Unit tests for In-App Booking Chat Messaging and Notification Center.
"""

def test_booking_chat_messaging(client, customer_token, provider_token, pending_booking):
    cust_headers = {"Authorization": f"Bearer {customer_token}"}
    prov_headers = {"Authorization": f"Bearer {provider_token}"}

    # 1. Customer sends chat message
    res1 = client.post(
        f"/api/v1/chat/bookings/{pending_booking.id}",
        json={"content": "Hello, when will you arrive?"},
        headers=cust_headers,
    )
    assert res1.status_code == 201
    assert res1.json()["content"] == "Hello, when will you arrive?"

    # 2. Provider receives message in chat history
    res2 = client.get(f"/api/v1/chat/bookings/{pending_booking.id}", headers=prov_headers)
    assert res2.status_code == 200
    assert len(res2.json()) == 1

    # 3. Provider checks notifications
    res_notif = client.get("/api/v1/notifications", headers=prov_headers)
    assert res_notif.status_code == 200
    assert len(res_notif.json()) > 0
    assert "New Chat Message" in res_notif.json()[0]["title"]
