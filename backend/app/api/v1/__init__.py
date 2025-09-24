from fastapi import APIRouter

from .endpoints import health, streaming, documents, chat

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(streaming.router, prefix="/streaming", tags=["streaming"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat", "rag"])

__all__ = ["api_router"]