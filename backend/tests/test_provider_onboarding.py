"""
Unit tests for Provider Onboarding and Verification.
"""

def test_unapproved_provider_hidden_from_public(client, unapproved_provider_user):
    res = client.get("/api/v1/providers/public")
    assert res.status_code == 200
    providers = res.json()
    assert len(providers) == 0


def test_approved_provider_visible_in_public(client, provider_user):
    res = client.get("/api/v1/providers/public")
    assert res.status_code == 200
    providers = res.json()
    assert len(providers) == 1
    assert providers[0]["id"] == provider_user.id


def test_admin_approve_provider(client, admin_token, unapproved_provider_user):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post(f"/api/v1/admin/providers/{unapproved_provider_user.id}/approve", headers=headers)
    assert res.status_code == 200
    assert res.json()["verification_status"] == "approved"

    # Now verify public endpoint shows the newly approved provider
    res_pub = client.get("/api/v1/providers/public")
    assert len(res_pub.json()) == 1


def test_admin_reject_provider(client, admin_token, unapproved_provider_user):
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"status": "rejected", "rejection_reason": "Missing electrical license."}
    res = client.post(f"/api/v1/admin/providers/{unapproved_provider_user.id}/reject", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "rejected"
    assert data["rejection_reason"] == "Missing electrical license."
