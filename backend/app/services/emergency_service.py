"""
Emergency Services — Rapid dispatcher for urgent plumbing, electrical, and AC repairs.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User, UserRole, VerificationStatus
from app.services.provider_service import get_approved_providers, calculate_haversine_distance



EMERGENCY_CATEGORIES = {"Plumbing", "Electrician", "AC Repair", "Home Cleaning"}


def find_nearby_emergency_providers(
    db: Session,
    category_id: Optional[int] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Search for emergency-ready providers.
    Calculates estimated arrival time based on distance.
    """
    providers = get_approved_providers(
        db,
        category_id=category_id,
        lat=lat,
        lng=lng,
        emergency_only=True,
    )

    results = []
    for p in providers:
        distance_km = 5.0  # Default fallback distance if coordinates missing
        if lat is not None and lng is not None and p.latitude is not None and p.longitude is not None:
            distance_km = calculate_haversine_distance(lat, lng, p.latitude, p.longitude)

        # Estimated arrival time: 15 mins base + 3 mins per km
        eta_minutes = int(round(15 + (distance_km * 3.0)))

        results.append({
            "provider": p,
            "distance_km": round(distance_km, 1),
            "estimated_arrival_minutes": max(15, min(90, eta_minutes)),
            "emergency_surcharge_percent": 20,
            "status_label": "Urgent Ready ⚡",
        })

    # Sort by arrival time ascending
    results.sort(key=lambda x: x["estimated_arrival_minutes"])
    return results
