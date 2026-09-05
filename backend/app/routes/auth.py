"""
Authentication API Endpoints (Google OAuth & Session).
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserResponse, Token, GoogleAuthRequest
from app.services.google_auth_service import process_google_login
from app.routes.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/google", response_model=Token)
def google_auth(
    auth_request: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    """
    Google OAuth Authentication Endpoint.
    Receives Google ID token from frontend, verifies it with Google,
    finds or creates user, and returns signed NexServe JWT.
    """
    user, access_token = process_google_login(
        db,
        credential=auth_request.credential,
        selected_role=auth_request.role,
        referral_code=auth_request.referral_code,
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )



@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return profile details for the currently authenticated user."""
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout current user session."""
    return {"message": "Successfully logged out.", "user_id": current_user.id}
