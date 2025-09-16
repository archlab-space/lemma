from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum

from ..db.base import Base


class UserPlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class UserTheme(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"


class User(Base):
    """User model representing a user profile."""
    
    def __init__(
        self,
        id: UUID,
        email: str,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        theme: UserTheme = UserTheme.LIGHT,
        language: str = "en",
        documents_uploaded: int = 0,
        queries_asked: int = 0,
        storage_used_bytes: int = 0,
        plan_type: UserPlanType = UserPlanType.FREE,
        max_documents: int = 10,
        max_storage_bytes: int = 1073741824,  # 1GB
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        last_login_at: Optional[datetime] = None,
        **kwargs
    ):
        self.id = id
        self.email = email
        self.full_name = full_name
        self.avatar_url = avatar_url
        self.theme = theme
        self.language = language
        self.documents_uploaded = documents_uploaded
        self.queries_asked = queries_asked
        self.storage_used_bytes = storage_used_bytes
        self.plan_type = plan_type
        self.max_documents = max_documents
        self.max_storage_bytes = max_storage_bytes
        self.created_at = created_at
        self.updated_at = updated_at
        self.last_login_at = last_login_at
        
        super().__init__(**kwargs)
    
    @property
    def storage_used_mb(self) -> float:
        """Get storage used in MB."""
        return self.storage_used_bytes / (1024 * 1024)
    
    @property
    def storage_used_percentage(self) -> float:
        """Get storage used as percentage of limit."""
        if self.max_storage_bytes == 0:
            return 0.0
        return (self.storage_used_bytes / self.max_storage_bytes) * 100
    
    @property
    def can_upload_document(self) -> bool:
        """Check if user can upload another document."""
        return self.documents_uploaded < self.max_documents
    
    def can_upload_file_size(self, file_size_bytes: int) -> bool:
        """Check if user can upload a file of given size."""
        return (self.storage_used_bytes + file_size_bytes) <= self.max_storage_bytes