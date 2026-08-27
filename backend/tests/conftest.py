"""
Pytest configuration and test fixtures for NexServe backend.
"""

import os
os.environ["TESTING"] = "true"

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # Ensures all SQLAlchemy models are registered on Base.metadata
from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole, VerificationStatus


from app.models.service import Category, Service
from app.models.booking import Booking, BookingStatus
from app.core.security import create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create fresh database tables for each test function."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden database session."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def customer_user(db_session):
    user = User(
        email="customer1@example.com",
        full_name="Test Customer 1",
        google_id="google-sub-cust-1",
        role=UserRole.CUSTOMER,
        is_active=True,
        latitude=12.9716,
        longitude=77.5946,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_customer_user(db_session):
    user = User(
        email="customer2@example.com",
        full_name="Test Customer 2",
        google_id="google-sub-cust-2",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def provider_user(db_session):
    user = User(
        email="provider1@example.com",
        full_name="Test Provider 1",
        google_id="google-sub-prov-1",
        role=UserRole.PROVIDER,
        hourly_rate=50.0,
        verification_status=VerificationStatus.APPROVED,
        is_active=True,
        latitude=12.9716,
        longitude=77.5946,
        service_radius_km=15.0,
        emergency_available=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def unapproved_provider_user(db_session):
    user = User(
        email="unapproved_provider@example.com",
        full_name="Unapproved Provider",
        google_id="google-sub-prov-pending",
        role=UserRole.PROVIDER,
        hourly_rate=45.0,
        verification_status=VerificationStatus.PENDING,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    user = User(
        email="admin@example.com",
        full_name="Test Administrator",
        google_id="google-sub-admin-1",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def customer_token(customer_user):
    return create_access_token(data={"sub": str(customer_user.id), "email": customer_user.email, "role": customer_user.role.value})


@pytest.fixture
def other_customer_token(other_customer_user):
    return create_access_token(data={"sub": str(other_customer_user.id), "email": other_customer_user.email, "role": other_customer_user.role.value})


@pytest.fixture
def provider_token(provider_user):
    return create_access_token(data={"sub": str(provider_user.id), "email": provider_user.email, "role": provider_user.role.value})


@pytest.fixture
def admin_token(admin_user):
    return create_access_token(data={"sub": str(admin_user.id), "email": admin_user.email, "role": admin_user.role.value})


@pytest.fixture
def sample_service(db_session, provider_user):
    category = Category(name="Cleaning", description="Cleaning services")
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)

    service = Service(
        title="Deep Home Cleaning",
        description="Full deep cleaning service",
        price=150.0,
        duration_minutes=120,
        category_id=category.id,
        provider_id=provider_user.id,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


@pytest.fixture
def pending_booking(db_session, customer_user, provider_user, sample_service):
    booking = Booking(
        customer_id=customer_user.id,
        provider_id=provider_user.id,
        service_id=sample_service.id,
        booking_date=datetime.now(timezone.utc),
        time_slot="10:00 AM - 11:00 AM",
        status=BookingStatus.PENDING,
        total_amount=150.0,
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    return booking


@pytest.fixture
def confirmed_booking(db_session, customer_user, provider_user, sample_service):
    booking = Booking(
        customer_id=customer_user.id,
        provider_id=provider_user.id,
        service_id=sample_service.id,
        booking_date=datetime.now(timezone.utc),
        time_slot="11:00 AM - 12:00 PM",
        status=BookingStatus.CONFIRMED,
        total_amount=150.0,
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    return booking


@pytest.fixture
def cancelled_booking(db_session, customer_user, provider_user, sample_service):
    booking = Booking(
        customer_id=customer_user.id,
        provider_id=provider_user.id,
        service_id=sample_service.id,
        booking_date=datetime.now(timezone.utc),
        time_slot="02:00 PM - 03:00 PM",
        status=BookingStatus.CANCELLED,
        total_amount=150.0,
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    return booking

