"""
Application Configuration — loads settings from environment variables.

WHY pydantic-settings?
- Automatically reads from .env files
- Provides type validation (e.g., if PORT must be int, it errors on "abc")
- Gives IDE autocompletion for all settings
- Single source of truth — no scattered os.getenv() calls

HOW IT WORKS:
1. Create a class inheriting from BaseSettings
2. Define fields with types and defaults
3. pydantic-settings reads matching env vars automatically
   (e.g., field `database_url` reads env var `DATABASE_URL`)
4. Import `settings` anywhere in the app to access config
"""

import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration for the NexServe application.
    All values can be overridden via environment variables or a .env file.
    """

    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "NexServe"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── Database ─────────────────────────────────────────
    # Format: postgresql://user:password@host:port/dbname
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/nexserve"

    # ── Authentication ───────────────────────────────────
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Razorpay ─────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    RAZORPAY_CURRENCY: str = "INR"

    # ── CORS ─────────────────────────────────────────────
    # Supports JSON array strings, comma-separated strings, or single URL strings
    CORS_ORIGINS: Union[List[str], str] = [
        "https://nexserve-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        origins = []
        if isinstance(v, str):
            v_clean = v.strip()
            if v_clean.startswith("[") and v_clean.endswith("]"):
                try:
                    origins = json.loads(v_clean)
                except Exception:
                    origins = [i.strip() for i in v_clean.strip("[]").split(",") if i.strip()]
            else:
                origins = [i.strip().strip("\"'") for i in v_clean.split(",") if i.strip()]
        elif isinstance(v, list):
            origins = list(v)

        # Always guarantee production frontend URL is present
        if "https://nexserve-frontend.onrender.com" not in origins:
            origins.append("https://nexserve-frontend.onrender.com")
        return origins

    # ── Pydantic Settings Config ─────────────────────────
    # This tells pydantic-settings WHERE to find the .env file
    # and that env vars should be case-insensitive.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Singleton instance — import this throughout the app
settings = Settings()
