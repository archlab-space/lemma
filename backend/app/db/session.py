from typing import AsyncGenerator
import asyncpg
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

# Global connection pool
_pool: asyncpg.Pool | None = None


async def create_db_pool() -> asyncpg.Pool:
    """Create and return a database connection pool."""
    global _pool
    
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                settings.database_url_async,
                min_size=1,
                max_size=10,
                command_timeout=60,
                server_settings={
                    'jit': 'off',
                    'application_name': 'lemma-api'
                }
            )
            logger.info("Database connection pool created successfully")
        except Exception as e:
            logger.error("Failed to create database pool", error=str(e))
            raise
    
    return _pool


async def close_db_pool() -> None:
    """Close the database connection pool."""
    global _pool
    
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")


async def get_db_pool() -> asyncpg.Pool:
    """Get the database connection pool, creating it if necessary."""
    if _pool is None:
        await create_db_pool()
    
    assert _pool is not None
    return _pool


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[asyncpg.Connection, None]:
    """Get a database connection from the pool."""
    pool = await get_db_pool()
    
    async with pool.acquire() as connection:
        try:
            yield connection
        except Exception:
            # Let the exception propagate
            raise