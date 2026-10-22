from langchain_core.callbacks import BaseCallbackHandler
from functools import lru_cache
from langsmith import Client, tracing_context

from app.config import get_settings


@lru_cache
def get_trace_client():
    settings = get_settings()

    if not settings.langsmith_api_key:
        raise ValueError("Set LANGSMITH_API_KEY before enabling LangSmith tracing.")

    return Client(
        api_url=settings.langsmith_endpoint,
        api_key=settings.langsmith_api_key,
        workspace_id=settings.langsmith_workspace_id,
    )


def query_tracing():
    settings = get_settings()

    return tracing_context(
        enabled=settings.langsmith_tracing,
        project_name=settings.langsmith_project,
        client=get_trace_client() if settings.langsmith_tracing else None,
    )


class CodeSageCallbackHandler(BaseCallbackHandler):

    def __init__(self):

        self.retrieval_latency = 0
        self.chunk_count = 0
        self.token_count = 0
        self.intent_confidence = 0.0
        self.model_provider = None
        self.model_name = None


    def log_retrieval(
            self,
            latency_ms,
            chunks
    ):
        
        self.retrieval_latency = latency_ms
        self.chunk_count = chunks


    def log_intent(self, confidence):

        self.intent_confidence = confidence


    def log_token(self, token_count: int):
        
        self.token_count = token_count


    def log_confidence(self, confidence: float):
        self.intent_confidence = confidence


    def log_model(self, provider: str, model: str):
        
        self.model_provider = provider
        self.model_name = model
