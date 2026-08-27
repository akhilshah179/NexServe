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

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────
# Creates a connection pool to PostgreSQL.
# pool_pre_ping=True: Tests connections before using them
# (prevents errors from stale connections).
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,  # Logs all SQL queries when DEBUG=True
)

# ── Session Factory ───────────────────────────────────────
# Each call to SessionLocal() creates a new database session.
# autocommit=False: We control when to commit (explicit transactions)
# autoflush=False: We control when SQLAlchemy sends SQL to the DB
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ── Base Class ────────────────────────────────────────────
# Every ORM model (User, Booking, etc.) will inherit from this.
# It gives them the ability to map to database tables.
Base = declarative_base()


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
