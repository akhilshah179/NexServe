"""
Google OAuth Authentication Service.
Verifies Google ID tokens and handles user creation / login.
"""

from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests

from app.core.config import settings
from app.models.user import User, UserRole
from app.core.security import create_access_token


def verify_google_token(credential: str) -> dict:
    """
    Verify a Google ID token's signature, audience, issuer, and expiry.
    Supports dev demo tokens when DEBUG=True for convenient local testing.
    """
    # Development / Testing demo fallback mode
    if settings.DEBUG and credential.startswith("demo-"):
        role_type = credential.replace("demo-", "")
        if role_type == "provider":
            return {
                "sub": "seeded-provider-1",
                "email": "priya.sharma@nexserve.com",
                "name": "Priya Sharma",
                "picture": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
                "email_verified": True,
                "iss": "accounts.google.com",
            }
        elif role_type == "admin":
            return {
                "sub": "seeded-admin-1",
                "email": "admin@nexserve.com",
                "name": "NexServe Admin",
                "picture": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
                "email_verified": True,
                "iss": "accounts.google.com",
            }
        else:
            return {
                "sub": "demo-customer-999",
                "email": "demo.customer@nexserve.com",
                "name": "Demo Customer",
                "picture": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "email_verified": True,
                "iss": "accounts.google.com",
            }

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google sign-in is not configured on the server.")
    try:
        id_info = id_token.verify_oauth2_token(credential, requests.Request(), audience=settings.GOOGLE_CLIENT_ID)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Google ID token verification failed: {str(e)}")
    if id_info.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token issuer.")
    if not id_info.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account email is not verified.")
    return id_info


def process_google_login(
    db: Session,
    credential: str,
    selected_role: Optional[UserRole] = UserRole.CUSTOMER,
    referral_code: Optional[str] = None,
) -> tuple[User, str]:
    """
    Processes a Google Sign-In request:
    1. Verifies the ID token
    2. Finds or creates the user in PostgreSQL/DB
    3. Ensures unique referral code and links referral if code provided
    4. Generates a signed NexServe JWT token
    """
    from app.services.referral_service import ensure_user_referral_code, link_referral_signup

    id_info = verify_google_token(credential)

    google_id = id_info.get("sub")
    email = id_info.get("email", "").lower()
    full_name = id_info.get("name") or id_info.get("given_name") or email.split("@")[0]
    profile_image = id_info.get("picture")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account missing required sub or email field.",
        )

    # Search DB for user by google_id or email
    user = db.query(User).filter((User.google_id == google_id) | (User.email == email)).first()

    is_new_user = False
    if user:
        if not user.google_id:
            user.google_id = google_id
        if profile_image and not user.profile_image:
            user.profile_image = profile_image
        if full_name and not user.full_name:
            user.full_name = full_name
        db.commit()
        db.refresh(user)
    else:
        # Default role CUSTOMER (or selected_role)
        is_new_user = True
        user_role = selected_role if selected_role in [UserRole.CUSTOMER, UserRole.PROVIDER] else UserRole.CUSTOMER
        user = User(
            google_id=google_id,
            email=email,
            full_name=full_name,
            profile_image=profile_image,
            role=user_role,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Ensure unique referral code
    ensure_user_referral_code(db, user)

    # Link referral if new user and referral code provided
    if is_new_user and referral_code:
        link_referral_signup(db, user, referral_code)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account has been deactivated.",
        )

    # Generate signed NexServe JWT access token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
    )

    return user, access_token

