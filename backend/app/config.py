from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):

    # App
    app_name: str = "CodeSage"
    debug: bool = True

    # API Keys
    gemini_api_key: str

    # Services
    qdrant_url: str = "http://localhost:6333"
    redis_url: str = "redis://localhost:6379"
    database_url: str

    # Embedding
    embed_model: str = "microsoft/unixcoder-base"
    embed_batch_size: int = 32

    class Config:
        env_file = ".env"


@lru_cache
def get_settings():
    return Settings()