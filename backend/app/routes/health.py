"""
Health Check Route.

WHY a health check?
- Lets you quickly verify the backend is running
- Used by Docker, load balancers, and monitoring tools to
  check if the app is alive
- Will be extended later to also check DB and Redis connectivity
"""

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.core.config import settings

router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("")
def health_check(response: Response, db: Session = Depends(get_db)):
    """
    Health & readiness check endpoint verifying API and Database connectivity.
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    is_healthy = response.status_code != status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": db_status,
        "environment": "debug" if settings.DEBUG else "production",
    }
