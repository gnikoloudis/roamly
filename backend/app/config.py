import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BACKEND_ROOT, ".env.local")

class Settings(BaseSettings):
    GOOGLE_API_KEY: Optional[str] = None
    DAILY_MAX_LIMIT: int = 10
    ALL_RAW_RESULTS_LIMIT: int = 5
    RESTAURANT_LIMIT: int = 3
    APP_ENV: str = "local"
    REDIS_URL: Optional[str] = None
    ALLOWED_ORIGINS: List[str] = []
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: List[str] = ["*"]
    ALLOW_HEADERS: List[str] = ["*"]
    ALLOW_ORIGIN_REGEX: Optional[str] = None

    def __init__(self, **values):
        super().__init__(**values)
        # Fallback check for MAX_REQUESTS alias key
        max_requests_env = os.environ.get("MAX_REQUESTS")
        if max_requests_env:
            try:
                self.DAILY_MAX_LIMIT = int(max_requests_env)
            except ValueError:
                pass
        # Parse ALLOWED_ORIGINS from environment variable (comma-separated)
        allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
        if allowed_origins_env:
            self.ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
        # Parse additional CORS settings from env
        allow_credentials_env = os.getenv("ALLOW_CREDENTIALS")
        if allow_credentials_env is not None:
            self.ALLOW_CREDENTIALS = allow_credentials_env.lower() in ("true", "1", "yes")
        allow_methods_env = os.getenv("ALLOW_METHODS")
        if allow_methods_env:
            self.ALLOW_METHODS = [m.strip() for m in allow_methods_env.split(",") if m.strip()]
        allow_headers_env = os.getenv("ALLOW_HEADERS")
        if allow_headers_env:
            self.ALLOW_HEADERS = [h.strip() for h in allow_headers_env.split(",") if h.strip()]
        allow_origin_regex_env = os.getenv("ALLOW_ORIGIN_REGEX")
        if allow_origin_regex_env:
            self.ALLOW_ORIGIN_REGEX = allow_origin_regex_env
        # Fallback to default allowed origins if not provided via env
        if not self.ALLOWED_ORIGINS:
            self.ALLOWED_ORIGINS = [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
            ]

    model_config = SettingsConfigDict(
        # Existing config
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
        env_nested_delimiter="__",
        env_ignore_empty=True,
    )
        env_file=ENV_FILE_PATH, 
        env_file_encoding="utf-8", 
        extra="ignore",
        # CRITICAL FIX: Tell Pydantic to ignore your terminal's broken cached variables 
        # and explicitly use the .env.local file values instead!
        env_nested_delimiter="__",
        env_ignore_empty=True
    )

settings = Settings()

def register_cors(app: FastAPI):
    """Register CORS middleware using settings values."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_origin_regex=settings.ALLOW_ORIGIN_REGEX,
        allow_credentials=settings.ALLOW_CREDENTIALS,
        allow_methods=settings.ALLOW_METHODS,
        allow_headers=settings.ALLOW_HEADERS,
    )