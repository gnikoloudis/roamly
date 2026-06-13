import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BACKEND_ROOT, ".env.local")

class Settings(BaseSettings):
    GOOGLE_API_KEY: Optional[str] = None
    DAILY_MAX_LIMIT: int = 10
    ALL_RAW_RESULTS_LIMIT: int = 5
    RESTAURANT_LIMIT: int = 3
    APP_ENV: str = "local"
    REDIS_URL: Optional[str] = None

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