from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserPlanType, UserTheme


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    theme: UserTheme = UserTheme.LIGHT
    language: str = Field(default="en", max_length=10)


class UserCreate(UserBase):
    """Schema for creating a new user."""
    pass


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    theme: Optional[UserTheme] = None
    language: Optional[str] = Field(None, max_length=10)


class UserProfile(BaseModel):
    """Schema for user profile information."""
    id: UUID
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    theme: UserTheme
    language: str
    plan_type: UserPlanType
    created_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserResponse(UserProfile):
    """Extended user response with usage statistics."""
    documents_uploaded: int
    queries_asked: int
    storage_used_bytes: int
    storage_used_mb: float
    storage_used_percentage: float
    max_documents: int
    max_storage_bytes: int
    can_upload_document: bool
    
    @property
    def storage_used_mb(self) -> float:
        return self.storage_used_bytes / (1024 * 1024)
    
    @property
    def storage_used_percentage(self) -> float:
        if self.max_storage_bytes == 0:
            return 0.0
        return (self.storage_used_bytes / self.max_storage_bytes) * 100
    
    @property
    def can_upload_document(self) -> bool:
        return self.documents_uploaded < self.max_documents


class UserStats(BaseModel):
    """Schema for user usage statistics."""
    documents_uploaded: int
    queries_asked: int
    storage_used_bytes: int
    storage_used_mb: float
    storage_used_percentage: float
    total_chat_sessions: int
    total_messages: int
    avg_queries_per_document: float
    
    class Config:
        from_attributes = True