"""
Customer Referral System API Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.routes.dependencies import get_current_user
from app.schemas.referral import (
    ReferralStatsResponse,
    ReferralValidateRequest,
    ReferralValidateResponse,
)
from app.services.referral_service import (
    get_user_referral_stats,
    validate_referral_code,
)

router = APIRouter(
    prefix="/referrals",
    tags=["Referral System"],
)


@router.get("/me", response_model=ReferralStatsResponse)
def get_my_referral_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get customer's unique referral code, wallet reward credits balance,
    and history of invited friends.
    """
    return get_user_referral_stats(db, current_user)


@router.post("/validate", response_model=ReferralValidateResponse)
def validate_referral_code_endpoint(
    req: ReferralValidateRequest,
    db: Session = Depends(get_db),
):
    """
    Validate a referral code during new user signup.
    """
    res = validate_referral_code(db, req.referral_code)
    if not res["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["reward_description"])

    return ReferralValidateResponse(
        valid=True,
        referrer_name=res["referrer_name"],
        reward_description=res["reward_description"],
    )
