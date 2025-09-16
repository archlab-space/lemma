from typing import Any, Dict

from fastapi import HTTPException, status


class LemmaException(Exception):
    """Base exception for Lemma application."""
    
    def __init__(
        self,
        message: str,
        error_code: str | None = None,
        details: Dict[str, Any] | None = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class LemmaHTTPException(HTTPException):
    """Base HTTP exception for Lemma API."""
    
    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str | None = None,
        details: Dict[str, Any] | None = None,
        headers: Dict[str, str] | None = None
    ):
        self.error_code = error_code
        self.details = details or {}
        
        detail = {
            "message": message,
            "error_code": error_code,
            "details": self.details
        }
        
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers=headers
        )


# Authentication Exceptions
class AuthenticationError(LemmaHTTPException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            error_code="AUTHENTICATION_FAILED"
        )


class AuthorizationError(LemmaHTTPException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            error_code="AUTHORIZATION_FAILED"
        )


class InvalidTokenError(AuthenticationError):
    def __init__(self, message: str = "Invalid or expired token"):
        super().__init__(message)
        self.error_code = "INVALID_TOKEN"


# Document Processing Exceptions
class DocumentProcessingError(LemmaHTTPException):
    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            error_code="DOCUMENT_PROCESSING_ERROR",
            details=details
        )


class DocumentNotFoundError(LemmaHTTPException):
    def __init__(self, document_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Document not found: {document_id}",
            error_code="DOCUMENT_NOT_FOUND",
            details={"document_id": document_id}
        )


class FileTooLargeError(LemmaHTTPException):
    def __init__(self, file_size: int, max_size: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            message=f"File size {file_size} bytes exceeds maximum {max_size} bytes",
            error_code="FILE_TOO_LARGE",
            details={"file_size": file_size, "max_size": max_size}
        )


class UnsupportedFileTypeError(LemmaHTTPException):
    def __init__(self, file_type: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=f"Unsupported file type: {file_type}",
            error_code="UNSUPPORTED_FILE_TYPE",
            details={"file_type": file_type}
        )


# Storage Exceptions
class StorageError(LemmaHTTPException):
    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            error_code="STORAGE_ERROR",
            details=details
        )


class StorageQuotaExceededError(LemmaHTTPException):
    def __init__(self, used: int, limit: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            message=f"Storage quota exceeded. Used: {used}, Limit: {limit}",
            error_code="STORAGE_QUOTA_EXCEEDED",
            details={"used": used, "limit": limit}
        )


# Database Exceptions
class DatabaseError(LemmaException):
    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(message, "DATABASE_ERROR", details)


class RecordNotFoundError(LemmaHTTPException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"{resource} not found: {identifier}",
            error_code="RECORD_NOT_FOUND",
            details={"resource": resource, "identifier": identifier}
        )


# RAG and LLM Exceptions
class EmbeddingError(LemmaHTTPException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            error_code="EMBEDDING_ERROR"
        )


class LLMError(LemmaHTTPException):
    def __init__(self, message: str, provider: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            error_code="LLM_ERROR",
            details={"provider": provider}
        )


class RateLimitExceededError(LemmaHTTPException):
    def __init__(self, limit: int, window: str):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            message=f"Rate limit exceeded: {limit} requests per {window}",
            error_code="RATE_LIMIT_EXCEEDED",
            details={"limit": limit, "window": window}
        )


# Validation Exceptions
class ValidationError(LemmaHTTPException):
    def __init__(self, message: str, field: str, value: Any = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            error_code="VALIDATION_ERROR",
            details={"field": field, "value": value}
        )