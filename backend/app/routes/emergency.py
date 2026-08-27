"""
Emergency Services API Endpoints — Rapid Dispatcher.
"""

from typing import List, Optional, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserResponse
from app.services.emergency_service import find_nearby_emergency_providers

router = APIRouter(
    prefix="/emergency",
    tags=["Emergency Services"],
)


@router.get("/providers")
def get_emergency_providers(
    category_id: Optional[int] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get emergency-ready providers sorted by estimated arrival time.
    Includes arrival ETA in minutes and emergency surcharge details.
    """
    raw_results = find_nearby_emergency_providers(db, category_id=category_id, lat=lat, lng=lng)
    
    # Format response payloads
    formatted = []
    for item in raw_results:
        provider_model = item["provider"]
        formatted.append({
            "provider": UserResponse.model_validate(provider_model),
            "distance_km": item["distance_km"],
            "estimated_arrival_minutes": item["estimated_arrival_minutes"],
            "emergency_surcharge_percent": item["emergency_surcharge_percent"],
            "status_label": item["status_label"],
        })
    return formatted
