"""
Address Service — Customer saved addresses management.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.address import Address
from app.schemas.address import AddressCreate, AddressUpdate


def get_user_addresses(db: Session, user_id: int) -> List[Address]:
    """Retrieve all saved addresses for a given user."""
    return db.query(Address).filter(Address.user_id == user_id).order_by(Address.is_default.desc(), Address.created_at.desc()).all()


def get_address_by_id(db: Session, address_id: int, user_id: int) -> Address:
    """Retrieve address by ID ensuring ownership."""
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user_id).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found.")
    return address


def create_address(db: Session, user_id: int, address_in: AddressCreate) -> Address:
    """Create a new address for user."""
    # If set as default or first address, reset existing defaults
    existing_count = db.query(Address).filter(Address.user_id == user_id).count()
    is_default = address_in.is_default or existing_count == 0

    if is_default:
        db.query(Address).filter(Address.user_id == user_id).update({"is_default": False})

    address = Address(
        user_id=user_id,
        label=address_in.label,
        full_address=address_in.full_address,
        city=address_in.city,
        postal_code=address_in.postal_code,
        latitude=address_in.latitude,
        longitude=address_in.longitude,
        is_default=is_default,
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


def update_address(db: Session, address_id: int, user_id: int, address_in: AddressUpdate) -> Address:
    """Update an existing address."""
    address = get_address_by_id(db, address_id, user_id)

    update_data = address_in.model_dump(exclude_unset=True)
    if update_data.get("is_default"):
        db.query(Address).filter(Address.user_id == user_id).update({"is_default": False})

    for field, value in update_data.items():
        setattr(address, field, value)

    db.commit()
    db.refresh(address)
    return address


def delete_address(db: Session, address_id: int, user_id: int) -> None:
    """Delete a user address."""
    address = get_address_by_id(db, address_id, user_id)
    was_default = address.is_default
    db.delete(address)
    db.commit()

    # If deleted address was default, promote next address to default
    if was_default:
        next_addr = db.query(Address).filter(Address.user_id == user_id).first()
        if next_addr:
            next_addr.is_default = True
            db.commit()
