"""
Database module — SQLAlchemy engine, session management, and Base class.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

db_url = settings.DATABASE_URL

# Handle sqlite specific connection arguments if sqlite is used
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(db_url, connect_args=connect_args)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception:
    # Fallback to local SQLite if PostgreSQL is not available
    fallback_url = "sqlite:///./nexserve.db"
    engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


from sqlalchemy.types import TypeDecorator, String

class FlexibleEnum(TypeDecorator):
    """Case-insensitive Enum type that handles uppercase/lowercase string values gracefully."""
    impl = String(50)
    cache_ok = True

    def __init__(self, enum_cls, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_cls = enum_cls

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_cls):
            return value.value
        return str(value).lower()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        val_str = str(value).lower()
        for member in self.enum_cls:
            if member.value.lower() == val_str or member.name.lower() == val_str:
                return member
        try:
            return self.enum_cls(value)
        except Exception:
            return value


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a transactional database session per request.
    Closes session automatically when request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
