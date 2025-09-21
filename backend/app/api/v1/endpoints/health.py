from fastapi import APIRouter, Depends, status
from typing import Dict, Any
import asyncpg
import time
from datetime import datetime, timezone

from app.core.dependencies import get_db_connection
from app.core.config import get_settings
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


@router.get("/", response_model=Dict[str, Any])
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "lemma-api",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }


@router.get("/detailed", response_model=Dict[str, Any])
async def detailed_health_check(
    db: asyncpg.Connection = Depends(get_db_connection),
):
    """Detailed health check with dependency verification."""
    start_time = time.time()
    checks = {}
    overall_status = "healthy"
    
    # Check database connection
    try:
        db_start = time.time()
        result = await db.fetchval("SELECT 1")
        db_duration = (time.time() - db_start) * 1000
        
        checks["database"] = {
            "status": "healthy" if result == 1 else "unhealthy",
            "duration_ms": round(db_duration, 2),
            "details": "PostgreSQL connection successful"
        }
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "duration_ms": 0,
            "details": f"Database connection failed: {str(e)}"
        }
        overall_status = "unhealthy"
    
    # Check vector extension
    try:
        vector_start = time.time()
        result = await db.fetchval("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')")
        vector_duration = (time.time() - vector_start) * 1000
        
        checks["vector_extension"] = {
            "status": "healthy" if result else "unhealthy",
            "duration_ms": round(vector_duration, 2),
            "details": "pg_vector extension available" if result else "pg_vector extension not found"
        }
        
        if not result:
            overall_status = "degraded"
    except Exception as e:
        checks["vector_extension"] = {
            "status": "unhealthy",
            "duration_ms": 0,
            "details": f"Vector extension check failed: {str(e)}"
        }
        overall_status = "unhealthy"
    
    # Check environment variables
    env_checks = []
    required_env_vars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "R2_BUCKET_NAME",
        "SECRET_KEY"
    ]
    
    for env_var in required_env_vars:
        value = getattr(settings, env_var, None)
        env_checks.append({
            "variable": env_var,
            "status": "set" if value else "missing"
        })
        if not value:
            overall_status = "degraded"
    
    checks["environment"] = {
        "status": "healthy" if all(check["status"] == "set" for check in env_checks) else "degraded",
        "duration_ms": 0,
        "details": env_checks
    }
    
    total_duration = (time.time() - start_time) * 1000
    
    response_data = {
        "status": overall_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "lemma-api",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "duration_ms": round(total_duration, 2),
        "checks": checks
    }
    
    # Set appropriate HTTP status code
    status_code = status.HTTP_200_OK
    if overall_status == "unhealthy":
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif overall_status == "degraded":
        status_code = status.HTTP_200_OK  # Still available but with warnings
    
    return response_data


@router.get("/ready", response_model=Dict[str, Any])
async def readiness_check(
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """Kubernetes-style readiness probe."""
    try:
        # Simple database check
        await db.fetchval("SELECT 1")
        
        return {
            "status": "ready",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        return {
            "status": "not_ready",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }


@router.get("/live", response_model=Dict[str, Any])
async def liveness_check():
    """Kubernetes-style liveness probe."""
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": time.time() - start_time if 'start_time' in globals() else 0
    }


# Track startup time for uptime calculation
start_time = time.time()