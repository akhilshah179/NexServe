"""
WebSocket API Endpoints for Live Booking Tracking & In-App Notifications.
Enforces authentication and authorization.
"""

import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.core.ws_manager import ws_manager
from app.core.security import decode_access_token
from app.core.config import settings
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.booking import Booking

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["WebSockets"],
)


def _authenticate_ws_token(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    try:
        return decode_access_token(token)
    except Exception:
        return None


@router.websocket("/ws/bookings/{booking_id}")
async def websocket_booking_tracking(
    websocket: WebSocket,
    booking_id: int,
    token: Optional[str] = Query(None),
):
    """
    Live WebSocket stream for tracking booking lifecycle progress in real time.
    Enforces authorization: only customer, provider, or admin may connect.
    """
    if token:
        payload = _authenticate_ws_token(token)
        if not payload or "sub" not in payload:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user_id = int(payload["sub"])
        db = SessionLocal()
        try:
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            caller = db.query(User).filter(User.id == user_id).first()
            if not caller or (caller.role != UserRole.ADMIN and user_id not in [booking.customer_id, booking.provider_id]):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        finally:
            db.close()
    elif not settings.DEBUG:
        # In production, token is strictly required
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect_booking(booking_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_booking(booking_id, websocket)
    except Exception as e:
        logger.warning(f"Booking #{booking_id} WS error: {e}")
        ws_manager.disconnect_booking(booking_id, websocket)


@router.websocket("/ws/user/{user_id}")
async def websocket_user_notifications(
    websocket: WebSocket,
    user_id: int,
    token: Optional[str] = Query(None),
):
    """
    Live WebSocket stream for in-app push notifications.
    Enforces authorization: users can only connect to their own notification stream.
    """
    if token:
        payload = _authenticate_ws_token(token)
        if not payload or "sub" not in payload:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        caller_id = int(payload["sub"])
        db = SessionLocal()
        try:
            caller = db.query(User).filter(User.id == caller_id).first()
            if not caller or (caller.role != UserRole.ADMIN and caller_id != user_id):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        finally:
            db.close()
    elif not settings.DEBUG:
        # In production, token is strictly required
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect_user(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_user(user_id, websocket)
    except Exception as e:
        logger.warning(f"User #{user_id} WS error: {e}")
        ws_manager.disconnect_user(user_id, websocket)
