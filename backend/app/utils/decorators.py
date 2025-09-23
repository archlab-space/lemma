"""
Reusable decorators for the Lemma application.
"""

import asyncio
from functools import wraps
from typing import Optional

from app.core.logging import get_logger

logger = get_logger(__name__)


def async_retry(max_retries: int = 3, delay: float = 1.0):
    """Async retry decorator with exponential backoff."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception: Optional[Exception] = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        wait_time = delay * (2 ** attempt)
                        logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {str(e)}. Retrying in {wait_time}s")
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"All {max_retries + 1} attempts failed for {func.__name__}: {str(e)}")
            
            # This should never happen since we always set last_exception in the except block,
            # but we need to handle it for type safety
            if last_exception is not None:
                raise last_exception
            else:
                raise RuntimeError(f"Retry loop completed without success or exception for {func.__name__}")
        return wrapper
    return decorator