from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
    )

    # App
    app_name: str = "CodeSage"
    debug: bool = True

    # API Keys
    gemini_api_key: str
    openai_api_key: Optional[str] = None

    # Services
    qdrant_url: str = "http://localhost:6333"
    redis_url: str = "redis://localhost:6379"
    database_url: str

    # Embedding
    embed_model: str = "microsoft/unixcoder-base"
    embed_batch_size: int = 32

    repo_path: str


@lru_cache
def get_settings():
    return Settings()