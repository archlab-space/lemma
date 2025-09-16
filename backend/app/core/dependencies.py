from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import asyncpg
from functools import lru_cache

from .config import get_settings
from .logging import get_logger
from .exceptions import AuthenticationError, InvalidTokenError
from ..db.session import get_db_session, create_db_pool, close_db_pool

settings = get_settings()
logger = get_logger(__name__)
security = HTTPBearer()


async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """Dependency to get a database connection."""
    async with get_db_session() as connection:
        yield connection


# Supabase Client Dependencies
@lru_cache()
def get_supabase_client() -> Client:
    """Get a Supabase client instance."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )


def get_supabase() -> Client:
    """Dependency to get Supabase client."""
    return get_supabase_client()


# Authentication Dependencies
class AuthService:
    """Service for handling authentication operations."""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def verify_token(self, token: str) -> dict:
        """Verify JWT token and return user data."""
        try:
            # Verify the JWT token with Supabase
            response = self.supabase.auth.get_user(token)
            
            if not response or not response.user:
                raise InvalidTokenError("Invalid token")
            
            return {
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata,
                "app_metadata": response.user.app_metadata,
            }
        except Exception as e:
            logger.error("Token verification failed", error=str(e))
            raise InvalidTokenError("Token verification failed")
    
    async def get_user_by_id(self, user_id: str) -> dict | None:
        """Get user data by ID."""
        try:
            response = self.supabase.table("users").select("*").eq("id", user_id).execute()
            
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error("Failed to get user by ID", user_id=user_id, error=str(e))
            return None


async def get_auth_service(
    supabase: Client = Depends(get_supabase)
) -> AuthService:
    """Dependency to get authentication service."""
    return AuthService(supabase)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> dict:
    """Dependency to get the current authenticated user."""
    token = credentials.credentials
    return await auth_service.verify_token(token)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    ),
    auth_service: AuthService = Depends(get_auth_service)
) -> dict | None:
    """Dependency to get the current user if authenticated, None otherwise."""
    if not credentials:
        return None
    
    try:
        return await auth_service.verify_token(credentials.credentials)
    except (AuthenticationError, InvalidTokenError):
        return None


# Settings Dependency
def get_app_settings():
    """Dependency to get application settings."""
    return settings


# Startup and Shutdown Events
async def startup_event():
    """Application startup event."""
    logger.info("Starting Lemma API server")
    await create_db_pool()


async def shutdown_event():
    """Application shutdown event."""
    logger.info("Shutting down Lemma API server")
    await close_db_pool()