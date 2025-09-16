from fastapi import APIRouter

from .endpoints import health, streaming

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(streaming.router, prefix="/streaming", tags=["streaming"])

__all__ = ["api_router"]