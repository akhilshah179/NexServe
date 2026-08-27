"""
Unit tests for Customer Addresses and Location Distance Matching.
"""

def test_customer_address_crud(client, customer_token):
    headers = {"Authorization": f"Bearer {customer_token}"}

    # 1. Create Address
    payload = {
        "label": "Home",
        "full_address": "123 MG Road, Indiranagar",
        "city": "Bengaluru",
        "postal_code": "560038",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "is_default": True,
    }
    res = client.post("/api/v1/addresses", json=payload, headers=headers)
    assert res.status_code == 201
    addr_id = res.json()["id"]
    assert res.json()["label"] == "Home"

    # 2. Get Addresses
    res_get = client.get("/api/v1/addresses", headers=headers)
    assert res_get.status_code == 200
    assert len(res_get.json()) == 1

    # 3. Update Address
    res_up = client.put(f"/api/v1/addresses/{addr_id}", json={"label": "Work", "full_address": "Tech Park", "city": "Bengaluru", "postal_code": "560038"}, headers=headers)
    assert res_up.status_code == 200
    assert res_up.json()["label"] == "Work"

    # 4. Delete Address
    res_del = client.delete(f"/api/v1/addresses/{addr_id}", headers=headers)
    assert res_del.status_code == 204
    assert len(client.get("/api/v1/addresses", headers=headers).json()) == 0


def test_location_radius_provider_search(client, provider_user):
    # Search nearby (12.9716, 77.5946 - 0km distance)
    res = client.get("/api/v1/providers/public?lat=12.9716&lng=77.5946")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Search very far outside radius (20.0, 78.0 - ~800km distance)
    res_far = client.get("/api/v1/providers/public?lat=20.0&lng=78.0")
    assert res_far.status_code == 200
    assert len(res_far.json()) == 0
