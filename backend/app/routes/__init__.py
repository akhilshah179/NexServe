"""
Routes package — exports API routers.
"""

from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.services import router as services_router
from app.routes.bookings import router as bookings_router
from app.routes.contact import router as contact_router
from app.routes.admin import router as admin_router
from app.routes.payments import router as payments_router
from app.routes.addresses import router as addresses_router
from app.routes.providers import router as providers_router
from app.routes.reviews import router as reviews_router
from app.routes.notifications import router as notifications_router
from app.routes.chat import router as chat_router
from app.routes.emergency import router as emergency_router
from app.routes.availability import router as availability_router

__all__ = [
    "health_router",
    "auth_router",
    "services_router",
    "bookings_router",
    "contact_router",
    "admin_router",
    "payments_router",
    "addresses_router",
    "providers_router",
    "reviews_router",
    "notifications_router",
    "chat_router",
    "emergency_router",
    "availability_router",
]


