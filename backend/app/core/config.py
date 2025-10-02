from functools import lru_cache

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Lemma API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "AI-Powered Academic Paper Analysis Platform"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: list[AnyHttpUrl] = Field(
        default_factory=lambda: [
            AnyHttpUrl("http://localhost:3000"),  # Frontend dev
            AnyHttpUrl("http://localhost:8000"),  # Backend dev
            AnyHttpUrl("https://localhost:3000"), # Frontend dev HTTPS
        ]
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        elif isinstance(v, str):
            return [v]
        raise ValueError(v)

    # Database Configuration (Supabase)
    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_ANON_KEY: str = "placeholder_anon_key"
    SUPABASE_SERVICE_KEY: str = "placeholder_service_key"
    
    # Direct PostgreSQL connection for async operations
    DATABASE_URL: str | None = None
    
    # Object Storage Configuration (Cloudflare R2)
    R2_BUCKET_NAME: str = "lemma-documents"
    R2_ACCESS_KEY_ID: str = "placeholder_access_key"
    R2_SECRET_ACCESS_KEY: str = "placeholder_secret_key"
    R2_ENDPOINT: str = "https://b49337c8c317194c858bde1373b9aac3.r2.cloudflarestorage.com"
    
    # LLM API Configuration
    OPENAI_API_KEY: str | None = None
    OPENROUTER_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    
    # Default LLM Settings
    DEFAULT_LLM_MODEL: str = "gpt-3.5-turbo"
    DEFAULT_EMBEDDING_MODEL: str = "text-embedding-3-small"
    DEFAULT_TEMPERATURE: float = 0.1
    DEFAULT_MAX_TOKENS: int = 4000
    
    # PDF Processing Configuration
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50MB
    MAX_PAGES_PER_DOCUMENT: int = 100
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    RATE_LIMIT_REQUESTS_PER_HOUR: int = 1000
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    WORKER_SECRET: str = "dev-worker-secret-change-in-production"  # Secret for Edge Worker authentication
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # or "console"
    
    # Feature Flags
    ENABLE_DOCS: bool = True
    ENABLE_METRICS: bool = True
    
    @property
    def database_url_async(self) -> str:
        """Get async database URL for direct PostgreSQL connection with asyncpg"""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        
        # For Supabase, we need the direct PostgreSQL connection URL
        # This should be set explicitly in environment variables as DATABASE_URL
        # Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
        
        # Fallback warning - this won't work in production
        import warnings
        warnings.warn(
            "DATABASE_URL not set. Using localhost fallback which won't work with Supabase. "
            "Set DATABASE_URL to your Supabase PostgreSQL connection string.",
            UserWarning
        )
        return "postgresql://postgres:password@localhost:5432/postgres"
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() in ("development", "dev", "local")
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")


@lru_cache()
def get_settings() -> Settings:
    return Settings()