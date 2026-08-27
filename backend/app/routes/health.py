"""
Health Check Route.

WHY a health check?
- Lets you quickly verify the backend is running
- Used by Docker, load balancers, and monitoring tools to
  check if the app is alive
- Will be extended later to also check DB and Redis connectivity
"""

from fastapi import APIRouter

# Create a router with a prefix and tag.
# prefix="/health": All routes in this file start with /health
# tags=["Health"]: Groups these endpoints in the Swagger docs
router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("")
def health_check():
    """
    Basic health check endpoint.

    Returns a simple JSON confirming the API is running.
    Later we'll add checks for:
    - Database connectivity
    - Redis connectivity
    - Celery worker status
    """
    return {
        "status": "healthy",
        "service": "NexServe API",
        "version": "1.0.0",
    }
