"""
WebSocket API Endpoints for Live Booking Tracking & In-App Notifications.
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["WebSockets"],
)


@router.websocket("/ws/bookings/{booking_id}")
async def websocket_booking_tracking(websocket: WebSocket, booking_id: int):
    """
    Live WebSocket stream for tracking booking lifecycle progress in real time.
    """
    await ws_manager.connect_booking(booking_id, websocket)
    try:
        while True:
            # Keep-alive heartbeat listener
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_booking(booking_id, websocket)
    except Exception as e:
        logger.warning(f"Booking #{booking_id} WS error: {e}")
        ws_manager.disconnect_booking(booking_id, websocket)


@router.websocket("/ws/user/{user_id}")
async def websocket_user_notifications(websocket: WebSocket, user_id: int):
    """
    Live WebSocket stream for in-app push notifications.
    """
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
