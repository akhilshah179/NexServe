"""
WebSocket Connection Manager for Real-Time Booking Tracking & User Notifications.
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections for live tracking and push updates."""

    def __init__(self):
        # booking_id -> list of WebSockets
        self.booking_connections: Dict[int, List[WebSocket]] = {}
        # user_id -> list of WebSockets
        self.user_connections: Dict[int, List[WebSocket]] = {}
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    def _dispatch_coroutine(self, coro):
        """Safely dispatches an async coroutine from sync or async contexts."""
        try:
            current_loop = asyncio.get_running_loop()
            if current_loop and current_loop.is_running():
                return current_loop.create_task(coro)
        except RuntimeError:
            pass

        if self.loop and self.loop.is_running():
            return asyncio.run_coroutine_threadsafe(coro, self.loop)
        else:
            try:
                loop = asyncio.new_event_loop()
                loop.run_until_complete(coro)
                loop.close()
            except Exception as e:
                logger.error(f"Failed to run WebSocket coroutine: {e}")

    async def connect_booking(self, booking_id: int, websocket: WebSocket):
        await websocket.accept()
        if booking_id not in self.booking_connections:
            self.booking_connections[booking_id] = []
        self.booking_connections[booking_id].append(websocket)
        logger.info(f"WebSocket connected for booking #{booking_id} (active: {len(self.booking_connections[booking_id])})")

    def disconnect_booking(self, booking_id: int, websocket: WebSocket):
        if booking_id in self.booking_connections:
            if websocket in self.booking_connections[booking_id]:
                self.booking_connections[booking_id].remove(websocket)
            if not self.booking_connections[booking_id]:
                del self.booking_connections[booking_id]
        logger.info(f"WebSocket disconnected for booking #{booking_id}")

    async def broadcast_booking(self, booking_id: int, event: dict):
        """Send live status/tracking event to all listeners of a specific booking."""
        if booking_id in self.booking_connections:
            message_text = json.dumps(event)
            dead_connections = []
            for ws in list(self.booking_connections.get(booking_id, [])):
                try:
                    await ws.send_text(message_text)
                except Exception as e:
                    logger.warning(f"Error broadcasting to booking #{booking_id} ws: {e}")
                    dead_connections.append(ws)
            for ws in dead_connections:
                self.disconnect_booking(booking_id, ws)

    def broadcast_booking_sync(self, booking_id: int, event: dict):
        """Synchronous wrapper for broadcast_booking."""
        return self._dispatch_coroutine(self.broadcast_booking(booking_id, event))

    async def connect_user(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user #{user_id} (active: {len(self.user_connections[user_id])})")

    def disconnect_user(self, user_id: int, websocket: WebSocket):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        logger.info(f"WebSocket disconnected for user #{user_id}")

    async def send_user_notification(self, user_id: int, event: dict):
        """Send in-app notification event directly to an active user socket."""
        if user_id in self.user_connections:
            message_text = json.dumps(event)
            dead_connections = []
            for ws in list(self.user_connections.get(user_id, [])):
                try:
                    await ws.send_text(message_text)
                except Exception as e:
                    logger.warning(f"Error sending to user #{user_id} ws: {e}")
                    dead_connections.append(ws)
            for ws in dead_connections:
                self.disconnect_user(user_id, ws)

    def send_user_notification_sync(self, user_id: int, event: dict):
        """Synchronous wrapper for send_user_notification."""
        return self._dispatch_coroutine(self.send_user_notification(user_id, event))


ws_manager = ConnectionManager()

