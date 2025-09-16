from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import time
from typing import Any

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger, log_request_response
from app.core.exceptions import LemmaHTTPException
from app.core.dependencies import startup_event, shutdown_event
from app.api.v1 import api_router

# Configure logging
configure_logging()
logger = get_logger(__name__)

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure with your domain in production
    )


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests and responses."""
    start_time = time.time()
    
    # Call the next middleware/endpoint
    response = await call_next(request)
    
    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000
    
    # Extract user ID if available
    user_id = None
    if hasattr(request.state, "user"):
        user_id = request.state.user.get("id")
    
    # Log the request/response
    log_request_response(
        method=request.method,
        url=str(request.url),
        status_code=response.status_code,
        duration_ms=duration_ms,
        user_id=user_id,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None
    )
    
    return response


# Exception handlers
@app.exception_handler(LemmaHTTPException)
async def lemma_exception_handler(request: Request, exc: LemmaHTTPException):
    """Handle custom Lemma exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail,
        headers=exc.headers
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning("Request validation error", errors=exc.errors())
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "message": "Request validation failed",
            "error_code": "VALIDATION_ERROR",
            "details": {"errors": exc.errors()}
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(
        "Unexpected error occurred",
        error=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "Internal server error",
            "error_code": "INTERNAL_ERROR",
            "details": {} if settings.is_production else {"error": str(exc)}
        }
    )


# Add startup and shutdown events
app.add_event_handler("startup", startup_event)
app.add_event_handler("shutdown", shutdown_event)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Lemma API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs" if settings.ENABLE_DOCS else None
    }


# if __name__ == "__main__":
#     import uvicorn
    
#     uvicorn.run(
#         "main:app",
#         host=settings.HOST,
#         port=settings.PORT,
#         reload=settings.DEBUG,
#         log_level=settings.LOG_LEVEL.lower(),
#         access_log=False,  # We handle logging in middleware
#     )
