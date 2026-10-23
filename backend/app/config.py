from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pydantic import Field
from typing import Literal, Optional
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
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None
    xai_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None

    # Answer generation and intent classification use the same provider and model.
    llm_provider: str = "gemini"
    gemini_model: str = "gemini-3.8-flash"
    gemini_thinking_level: Literal["low", "medium", "high"] = "low"
    openai_model: Optional[str] = None
    anthropic_model: Optional[str] = None
    deepseek_model: Optional[str] = None
    groq_model: Optional[str] = None
    mistral_model: Optional[str] = None
    xai_model: Optional[str] = None
    openrouter_model: Optional[str] = None
    llm_timeout_seconds: float = Field(default=60, gt=0)
    llm_max_output_tokens: int = Field(default=4096, gt=0)

    # Tracing
    langsmith_tracing: bool = False
    langsmith_api_key: Optional[str] = None
    langsmith_project: str = "codesage"
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_workspace_id: Optional[str] = None

    # Services
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: Optional[str] = None
    redis_url: str = "redis://localhost:6379"
    database_url: str

    # Embedding
    embed_model: str = "microsoft/unixcoder-base"
    embed_batch_size: int = 32

    repo_path: Path = Path("/tmp/workspaces")


@lru_cache
def get_settings():
    return Settings()
