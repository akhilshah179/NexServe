"""
Referral Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.referral import ReferralStatus


class ReferralItemResponse(BaseModel):
    id: int
    referred_user_name: str
    referral_code: str
    status: ReferralStatus
    reward_amount: float
    created_at: datetime
    rewarded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReferralStatsResponse(BaseModel):
    referral_code: str
    referral_credits_balance: float
    total_referrals_count: int
    successful_referrals_count: int
    total_earned_credits: float
    referral_history: List[ReferralItemResponse] = []


class ReferralValidateRequest(BaseModel):
    referral_code: str


class ReferralValidateResponse(BaseModel):
    valid: bool
    referrer_name: Optional[str] = None
    reward_description: str
