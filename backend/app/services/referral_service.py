"""
Referral System Business Logic and Reward Release Engine.
"""

import random
import string
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.referral import Referral, ReferralStatus
from app.models.booking import Booking, BookingStatus
from app.schemas.referral import ReferralStatsResponse, ReferralItemResponse
from app.services.notification_service import create_notification


def generate_unique_referral_code(db: Session, user_full_name: str) -> str:
    """Generate a readable, unique referral code e.g. NEXAKHIL100 or NEXJOHN482."""
    clean_name = "".join(filter(str.isalnum, user_full_name.upper()))[:6] or "NEX"
    for _ in range(20):
        rand_suffix = "".join(random.choices(string.digits, k=3))
        code = f"NEX{clean_name}{rand_suffix}"
        if not db.query(User).filter(User.referral_code == code).first():
            return code
    # Fallback
    return f"NEX{random.randint(10000, 99999)}"


def ensure_user_referral_code(db: Session, user: User) -> str:
    """Ensure every user has an assigned unique referral code."""
    if not user.referral_code:
        user.referral_code = generate_unique_referral_code(db, user.full_name)
        db.commit()
        db.refresh(user)
    return user.referral_code


def validate_referral_code(db: Session, code: str, current_user_id: Optional[int] = None) -> Dict[str, Any]:
    """Validate referral code."""
    clean_code = code.strip().upper()
    referrer = db.query(User).filter(User.referral_code == clean_code).first()

    if not referrer:
        return {"valid": False, "referrer_name": None, "reward_description": "Invalid referral code."}

    if current_user_id and referrer.id == current_user_id:
        return {"valid": False, "referrer_name": None, "reward_description": "You cannot refer yourself."}

    return {
        "valid": True,
        "referrer_id": referrer.id,
        "referrer_name": referrer.full_name,
        "reward_description": f"Referred by {referrer.full_name}. Get ₹100 credit on your first completed booking!",
    }


def link_referral_signup(db: Session, new_user: User, referral_code: str):
    """Link newly registered customer to referrer."""
    val = validate_referral_code(db, referral_code, new_user.id)
    if val["valid"]:
        # Check if already linked
        existing = db.query(Referral).filter(Referral.referred_user_id == new_user.id).first()
        if not existing:
            ref = Referral(
                referrer_id=val["referrer_id"],
                referred_user_id=new_user.id,
                referral_code=referral_code.strip().upper(),
                status=ReferralStatus.PENDING,
                reward_amount=100.0,
            )
            db.add(ref)
            db.commit()


def check_and_reward_referral_on_booking_complete(db: Session, booking: Booking):
    """
    When customer completes their FIRST qualifying booking, release the ₹100 reward
    to the referring user and notify both parties.
    """
    if booking.status != BookingStatus.COMPLETED:
        return

    # Check if this customer was referred and referral is still PENDING
    referral = (
        db.query(Referral)
        .filter(
            Referral.referred_user_id == booking.customer_id,
            Referral.status == ReferralStatus.PENDING,
        )
        .first()
    )

    if not referral:
        return

    # Ensure this is their first completed booking
    completed_count = (
        db.query(Booking)
        .filter(
            Booking.customer_id == booking.customer_id,
            Booking.status == BookingStatus.COMPLETED,
        )
        .count()
    )

    if completed_count == 1:
        # Release reward to referrer
        referrer = db.query(User).filter(User.id == referral.referrer_id).first()
        if referrer:
            referrer.referral_credits = getattr(referrer, "referral_credits", 0.0) + referral.reward_amount
            referral.status = ReferralStatus.REWARDED
            referral.rewarded_at = datetime.now(timezone.utc)
            referral.qualifying_booking_id = booking.id
            db.commit()

            # Trigger notification to referrer
            create_notification(
                db,
                user_id=referrer.id,
                title="🎁 Referral Reward Credited!",
                message=f"Your friend completed their first service! ₹{referral.reward_amount} reward credits have been added to your NexServe wallet.",
                notification_type="referral_reward",
                related_booking_id=booking.id,
            )


def get_user_referral_stats(db: Session, user: User) -> ReferralStatsResponse:
    """Retrieve user's referral code, credits, and referrals ledger."""
    code = ensure_user_referral_code(db, user)
    referrals = db.query(Referral).filter(Referral.referrer_id == user.id).order_by(Referral.created_at.desc()).all()

    total_count = len(referrals)
    successful_count = sum(1 for r in referrals if r.status == ReferralStatus.REWARDED)
    total_earned = sum(r.reward_amount for r in referrals if r.status == ReferralStatus.REWARDED)

    history = [
        ReferralItemResponse(
            id=r.id,
            referred_user_name=r.referred_user.full_name if r.referred_user else "Friend",
            referral_code=r.referral_code,
            status=r.status,
            reward_amount=r.reward_amount,
            created_at=r.created_at,
            rewarded_at=r.rewarded_at,
        )
        for r in referrals
    ]

    return ReferralStatsResponse(
        referral_code=code,
        referral_credits_balance=round(getattr(user, "referral_credits", 0.0), 2),
        total_referrals_count=total_count,
        successful_referrals_count=successful_count,
        total_earned_credits=round(total_earned, 2),
        referral_history=history,
    )
