from typing import AsyncGenerator
from fastapi import Depends, HTTPException, Request
import asyncpg

from .config import get_settings
from .logging import get_logger
from ..db.session import get_db_session, create_db_pool, close_db_pool

settings = get_settings()
logger = get_logger(__name__)


async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """Dependency to get a database connection."""
    async with get_db_session() as connection:
        yield connection


# Worker-based Authentication (replaced JWT verification)
# Edge Workers handle JWT validation and pass user info via headers


async def verify_worker_secret(request: Request) -> None:
    """Verify that the request comes from a legitimate Edge Worker."""
    worker_secret = request.headers.get("X-Worker-Secret")
    
    if not worker_secret or worker_secret != settings.WORKER_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing worker secret"
        )


async def get_current_user_from_headers(
    request: Request,
    _: None = Depends(verify_worker_secret)  # Ensure worker secret is valid first
) -> dict:
    """Extract user information from trusted Edge Worker headers."""
    user_id = request.headers.get("X-User-ID")
    user_email = request.headers.get("X-User-Email")
    user_role = request.headers.get("X-User-Role", "user")
    
    if not user_id or not user_email:
        raise HTTPException(
            status_code=401,
            detail="Missing user information in headers"
        )
    
    return {
        "id": user_id,
        "email": user_email,
        "role": user_role
    }


async def get_current_user_id(
    current_user: dict = Depends(get_current_user_from_headers)
) -> str:
    """Dependency to get the current user's ID."""
    return current_user["id"]


# Startup and Shutdown Events
async def startup_event():
    """Application startup event."""
    logger.info("Starting Lemma API server")
    await create_db_pool()


async def shutdown_event():
    """Application shutdown event."""
    logger.info("Shutting down Lemma API server")
    await close_db_pool()