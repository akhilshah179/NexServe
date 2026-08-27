"""Razorpay order creation, signature verification, webhooks, platform commissions, and refunds."""

import os
import hashlib
import hmac

import json
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole
from app.routes.dependencies import get_current_user, require_admin
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentResponse,
    PaymentVerifyRequest,
    RefundRequest,
)
from app.services.notification_service import create_notification

router = APIRouter(prefix="/payments", tags=["Payments"])

PLATFORM_COMMISSION_PERCENT = 10  # 10% platform fee on bookings


def _require_razorpay() -> None:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        if settings.DEBUG and not os.getenv("TESTING"):
            return  # Allow mock test order creation in dev mode
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay is not configured on the server.",
        )



def _get_customer_booking(db: Session, booking_id: int, user: User) -> Booking:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user.role != UserRole.ADMIN and booking.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this booking")
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cancelled bookings cannot be paid")
    return booking


@router.post("/orders", response_model=PaymentOrderResponse, status_code=status.HTTP_201_CREATED)
def create_payment_order(
    payload: PaymentOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a server-authoritative Razorpay order for one booking using integer paise values."""
    _require_razorpay()
    booking = _get_customer_booking(db, payload.booking_id, current_user)
    if booking.status in {BookingStatus.CONFIRMED, BookingStatus.COMPLETED}:
        raise HTTPException(status_code=400, detail="Booking is already paid and confirmed")

    amount_paise = int((Decimal(str(booking.total_amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    commission_paise = int(amount_paise * (PLATFORM_COMMISSION_PERCENT / 100.0))
    receipt = f"receipt_b{booking.id}_{int(datetime.now(timezone.utc).timestamp())}"

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        try:
            response = requests.post(
                "https://api.razorpay.com/v1/orders",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                json={
                    "amount": amount_paise,
                    "currency": settings.RAZORPAY_CURRENCY,
                    "receipt": receipt,
                },
                timeout=15,
            )
            response.raise_for_status()
            razorpay_order = response.json()
            order_id = razorpay_order["id"]
            key_id = settings.RAZORPAY_KEY_ID
        except requests.RequestException as e:
            print(f"[RAZORPAY ERROR] Failed to create order: {e}")
            raise HTTPException(status_code=502, detail="Unable to create a Razorpay order. Please try again.")
    else:
        # Development / Demo Mock Mode Order
        order_id = f"order_demo_{booking.id}_{int(datetime.now(timezone.utc).timestamp())}"
        key_id = "rzp_test_demo_key"

    payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    if not payment:
        payment = Payment(
            booking_id=booking.id,
            razorpay_order_id=order_id,
            amount_paise=amount_paise,
            platform_commission_paise=commission_paise,
            receipt_number=receipt,
            currency=settings.RAZORPAY_CURRENCY,
            status=PaymentStatus.CREATED,
        )
        db.add(payment)

    else:
        payment.razorpay_order_id = order_id
        payment.status = PaymentStatus.CREATED

    db.commit()

    return PaymentOrderResponse(
        razorpay_order_id=payment.razorpay_order_id,
        amount=amount_paise,
        currency=payment.currency,
        key_id=key_id,
        booking_id=booking.id,
    )



@router.post("/verify", response_model=PaymentResponse)
def verify_payment(
    payload: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify Checkout's HMAC response using the locally stored order ID."""
    _require_razorpay()
    payment = db.query(Payment).filter(Payment.razorpay_order_id == payload.razorpay_order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found")

    booking = _get_customer_booking(db, payment.booking_id, current_user)

    # In Demo / Test mode
    if payload.razorpay_order_id.startswith("order_demo_") or payload.razorpay_signature.startswith("demo_"):
        payment.status = PaymentStatus.VERIFIED
        payment.razorpay_payment_id = payload.razorpay_payment_id
        payment.razorpay_signature = payload.razorpay_signature
        if booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.CONFIRMED
        db.commit()
        db.refresh(payment)
        return payment

    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{payment.razorpay_order_id}|{payload.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, payload.razorpay_signature):

        payment.status = PaymentStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.razorpay_signature = payload.razorpay_signature
    payment.status = PaymentStatus.VERIFIED
    payment.verified_at = datetime.now(timezone.utc)

    # Automatically confirm booking state upon payment verification
    if booking.status == BookingStatus.PENDING:
        booking.status = BookingStatus.CONFIRMED

    db.commit()
    db.refresh(payment)

    # Send notifications
    create_notification(
        db,
        user_id=booking.customer_id,
        title="Payment Successful",
        message=f"Payment for Booking #{booking.id} was successfully verified.",
        notification_type="payment_success",
        related_booking_id=booking.id,
    )

    return payment


@router.post("/refund", response_model=PaymentResponse)
def refund_payment(
    refund_in: RefundRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Process a refund for a payment (Admin only)."""
    payment = db.query(Payment).filter(Payment.id == refund_in.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if payment.status == PaymentStatus.REFUNDED:
        raise HTTPException(status_code=400, detail="Payment has already been refunded.")

    refund_amount = refund_in.refund_amount_paise or payment.amount_paise

    # Call Razorpay refund API if configured
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and payment.razorpay_payment_id:
        try:
            resp = requests.post(
                f"https://api.razorpay.com/v1/payments/{payment.razorpay_payment_id}/refund",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                json={"amount": refund_amount, "notes": {"reason": refund_in.reason or "Admin refund"}},
                timeout=15,
            )
            if resp.status_code == 200:
                refund_data = resp.json()
                payment.refund_id = refund_data.get("id")
        except Exception as e:
            print(f"[REFUND API ERROR] {e}")

    payment.status = PaymentStatus.REFUNDED
    payment.cancellation_refund_paise = refund_amount
    db.commit()
    db.refresh(payment)

    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    if booking:
        create_notification(
            db,
            user_id=booking.customer_id,
            title="Refund Processed",
            message=f"A refund of ₹{refund_amount / 100:.2f} has been issued for Booking #{booking.id}.",
            notification_type="payment_refunded",
            related_booking_id=booking.id,
        )

    return payment


@router.get("", response_model=List[PaymentResponse])
def list_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List payments for admin dashboard or current customer."""
    if current_user.role == UserRole.ADMIN:
        return db.query(Payment).order_by(Payment.created_at.desc()).all()

    # Customers see their own booking payments
    return (
        db.query(Payment)
        .join(Payment.booking)
        .filter(Booking.customer_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .all()
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Record Razorpay's signed payment status; configure this URL in Razorpay."""
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay webhook is not configured")

    raw_body = await request.body()
    signature_header = request.headers.get("X-Razorpay-Signature", "")

    expected_signature = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature_header):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = json.loads(raw_body)
    entity = event.get("payload", {}).get("payment", {}).get("entity", {})
    payment = db.query(Payment).filter(Payment.razorpay_order_id == entity.get("order_id")).first()

    if not payment:
        return {"status": "ignored"}

    event_type = event.get("event")
    if event_type in ["payment.captured", "order.paid"]:
        payment.status = PaymentStatus.CAPTURED
        payment.razorpay_payment_id = entity.get("id") or payment.razorpay_payment_id
        booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
        if booking and booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.CONFIRMED

    elif event_type == "payment.failed":
        payment.status = PaymentStatus.FAILED

    db.commit()
    return {"status": "ok"}
