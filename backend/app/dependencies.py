"""Shared FastAPI dependencies, re-exported so routers only need one import path."""
from __future__ import annotations

from app.core.security import get_current_user, require_roles
from app.database import get_db

__all__ = ["get_db", "get_current_user", "require_roles"]
