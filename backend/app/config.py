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

    # Retrieval models. Model identifiers and endpoint defaults live only here;
    # every field can be overridden by environment variables.
    voyage_api_key: Optional[str] = None
    cohere_api_key: Optional[str] = None
    embed_provider: str = "gemini"
    embed_model: str = "gemini-embedding-2"
    embed_dimensions: Optional[int] = Field(default=None, gt=0)
    embed_batch_size: int = Field(default=32, gt=0)
    embed_api_key: Optional[str] = None
    embed_base_url: Optional[str] = None
    embed_revision: Optional[str] = None
    embed_query_prefix: str = ""
    embed_document_prefix: str = ""
    embed_query_task: Optional[str] = None
    embed_document_task: Optional[str] = None
    embed_local_max_length: int = Field(default=512, ge=5, lt=1024)
    embed_local_model_options: dict = Field(default_factory=dict)
    embed_local_encode_options: dict = Field(default_factory=dict)
    embedding_cache_path: str = ".embedding_cache"
    embedding_source_max_chars: Optional[int] = Field(default=None, gt=0)
    embedding_graph_neighbors: int = Field(default=5, ge=0)
    embedding_representation_version: str = "1"

    rerank_provider: str = "gemini"
    rerank_model: str = "gemini-3.8-flash"
    rerank_api_key: Optional[str] = None
    rerank_base_url: Optional[str] = None
    rerank_revision: Optional[str] = None
    rerank_batch_size: int = Field(default=16, gt=0)
    rerank_top_k: int = Field(default=20, gt=0)
    rerank_max_candidates: int = Field(default=100, gt=0)
    rerank_document_max_chars: Optional[int] = Field(default=None, gt=0)
    rerank_max_output_tokens: int = Field(default=4096, gt=0)
    rerank_local_model_options: dict = Field(default_factory=dict)
    rerank_local_predict_options: dict = Field(default_factory=dict)
    retrieval_model_timeout_seconds: float = Field(default=60, gt=0)
    retrieval_model_attempts: int = Field(default=3, ge=1, le=5)
    retrieval_model_retry_delay_seconds: float = Field(default=1, ge=0)
    voyage_base_url: str = "https://api.voyageai.com/v1"
    cohere_base_url: str = "https://api.cohere.com/v2"
    embedding_openai_base_url: str = "https://api.openai.com/v1"
    qdrant_collection: str = "codesage"

    repo_path: Path = Path("/tmp/workspaces")


@lru_cache
def get_settings():
    return Settings()
