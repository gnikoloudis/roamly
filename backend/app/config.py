import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List, Union
from pydantic import field_validator
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
    ALLOWED_ORIGINS: Union[str, List[str]] = []
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: Union[str, List[str]] = ["*"]
    ALLOW_HEADERS: Union[str, List[str]] = ["*"]
    ALLOW_ORIGIN_REGEX: Optional[str] = None

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            v = [origin.strip() for origin in v.split(",") if origin.strip()]
        if not v:
            return [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
            ]
        return v

    @field_validator("ALLOW_METHODS", "ALLOW_HEADERS", mode="before")
    @classmethod
    def parse_comma_separated_list(cls, v):
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    def __init__(self, **values):
        super().__init__(**values)
        # Fallback check for MAX_REQUESTS alias key
        max_requests_env = os.environ.get("MAX_REQUESTS")
        if max_requests_env:
            try:
                self.DAILY_MAX_LIMIT = int(max_requests_env)
            except ValueError:
                pass

    model_config = SettingsConfigDict(
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