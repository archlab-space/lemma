from typing import Any, Dict, Optional
from datetime import datetime
import uuid


class Base:
    """Base class for database models with common functionality."""
    
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary."""
        result = {}
        for key, value in self.__dict__.items():
            if not key.startswith('_'):
                if isinstance(value, datetime):
                    result[key] = value.isoformat()
                elif isinstance(value, uuid.UUID):
                    result[key] = str(value)
                else:
                    result[key] = value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Base":
        """Create model instance from dictionary."""
        return cls(**data)