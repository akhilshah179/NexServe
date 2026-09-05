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
from app.routes.ws import router as ws_router
from app.routes.pricing import router as pricing_router
from app.routes.coupons import router as coupons_router
from app.routes.referrals import router as referrals_router
from app.routes.recommendations import router as recommendations_router
from app.routes.attachments import router as attachments_router
from app.routes.rentals import router as rentals_router

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
    "ws_router",
    "pricing_router",
    "coupons_router",
    "referrals_router",
    "recommendations_router",
    "attachments_router",
    "rentals_router",
]
