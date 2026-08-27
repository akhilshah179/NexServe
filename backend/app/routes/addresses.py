"""
Address API Endpoints — Customer Saved Addresses.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.routes.dependencies import get_current_user
from app.services.address_service import (
    get_user_addresses,
    get_address_by_id,
    create_address,
    update_address,
    delete_address,
)

router = APIRouter(
    prefix="/addresses",
    tags=["Addresses"],
)


@router.get("", response_model=List[AddressResponse])
def list_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all saved addresses for the authenticated user."""
    return get_user_addresses(db, current_user.id)


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def add_address(
    address_in: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new address for authenticated user."""
    return create_address(db, current_user.id, address_in)


@router.put("/{address_id}", response_model=AddressResponse)
def edit_address(
    address_id: int,
    address_in: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing address."""
    return update_address(db, address_id, current_user.id, address_in)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved address."""
    delete_address(db, address_id, current_user.id)
    return None
