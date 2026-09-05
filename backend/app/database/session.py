"""
Database Session Configuration.

WHY this file?
- SQLAlchemy needs an "engine" (the connection to the database)
  and a "session factory" (creates sessions for each request).
- We define them here so every part of the app uses the SAME
  connection pool, avoiding resource leaks.

KEY CONCEPTS:
- Engine: The actual connection pool to PostgreSQL
- SessionLocal: A factory that creates new database sessions
- Base: The declarative base class all ORM models inherit from
- get_db(): A FastAPI dependency that gives each request its own
  session and ensures it's closed after the request finishes
  (even if there's an error).
"""

from app.database.database import engine, SessionLocal, Base, get_db


# ── Dependency ────────────────────────────────────────────
def get_db():
    """
    FastAPI dependency that provides a database session per request.

    Usage in a route:
        @router.get("/users")
        def get_users(db: Session = Depends(get_db)):
            ...

    The `yield` keyword makes this a generator:
    1. Creates a session
    2. Yields it to the route handler
    3. After the route finishes (or errors), closes the session

    This pattern is called "dependency injection" — FastAPI
    automatically calls this function and passes the session
    to any route that asks for it via Depends().
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
