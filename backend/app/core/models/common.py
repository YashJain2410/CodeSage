from functools import cached_property
import time
from typing import Protocol

import httpx
import numpy as np

from app.core.llm.errors import ModelConfigurationError, ModelRequestError


class EmbeddingBackend(Protocol):
    def encode(self, texts: list[str], *, query: bool) -> np.ndarray: ...


class RankingBackend(Protocol):
    def rank(self, query: str, documents: list[str]) -> list[tuple[int, float]]: ...


def api_key(settings, role, provider, *, required=True):
    key = getattr(settings, f"{role}_api_key") or getattr(settings, f"{provider}_api_key", None)
    if required and (not key or not key.strip()):
        raise ModelConfigurationError(f"Set {role.upper()}_API_KEY or {provider.upper()}_API_KEY.")
    return key


class JsonEndpoint:
    """Bounded retries against the selected endpoint; never switches models."""

    def __init__(self, settings, base_url, key=None):
        self.settings = settings
        if not base_url or not base_url.strip():
            raise ModelConfigurationError("Configure the selected retrieval model's base URL.")
        self.base_url = base_url.rstrip("/") + "/"
        self.key = key

    @cached_property
    def client(self):
        headers = {"Authorization": f"Bearer {self.key}"} if self.key else {}
        return httpx.Client(base_url=self.base_url, headers=headers,
                            timeout=self.settings.retrieval_model_timeout_seconds)

    def post(self, path, payload):
        for attempt in range(self.settings.retrieval_model_attempts):
            retry = False
            try:
                response = self.client.post(path, json=payload)
                retry = response.status_code == 429 or response.status_code >= 500
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
            except httpx.TransportError:
                retry, status = True, "connection failure"
            except ValueError:
                raise ModelRequestError("Retrieval endpoint returned invalid JSON.") from None
            if not retry or attempt + 1 == self.settings.retrieval_model_attempts:
                # Do not include provider response bodies, credentials or source text.
                raise ModelRequestError(f"Retrieval endpoint failed ({status}); no fallback was used.") from None
            time.sleep(self.settings.retrieval_model_retry_delay_seconds * (2 ** attempt))


def ordered_embeddings(data, count):
    """API results may arrive out of order. Reject omissions and duplicates."""
    if not isinstance(data, list) or len(data) != count:
        raise ModelRequestError("Embedding endpoint returned an incorrect result count.")
    result = [None] * count
    for item in data:
        index = item.get("index") if isinstance(item, dict) else None
        if type(index) is not int or not 0 <= index < count or result[index] is not None:
            raise ModelRequestError("Embedding endpoint returned invalid or duplicate indices.")
        result[index] = item.get("embedding")
    return result


def validate_ranking(rows, count):
    if not isinstance(rows, list) or len(rows) != count:
        raise ModelRequestError("Reranker must return one score for every candidate.")
    seen, result = set(), []
    for row in rows:
        index = row.get("index") if isinstance(row, dict) else None
        score = row.get("relevance_score") if isinstance(row, dict) else None
        if (type(index) is not int or not 0 <= index < count or index in seen
                or type(score) not in (int, float) or not np.isfinite(score)):
            raise ModelRequestError("Reranker returned invalid indices or scores.")
        seen.add(index)
        result.append((index, float(score)))
    return sorted(result, key=lambda item: item[1], reverse=True)


def embedding_fingerprint(settings):
    import hashlib
    import json
    # Never include API keys. Endpoint identity matters for private/local models.
    fields = ("embed_provider", "embed_model", "embed_dimensions", "embed_revision",
              "embed_base_url", "embed_query_prefix", "embed_document_prefix",
              "embed_query_task", "embed_document_task", "embed_local_model_options",
              "embed_local_encode_options", "embed_local_max_length", "embedding_source_max_chars",
              "embedding_graph_neighbors", "embedding_representation_version")
    value = {key: getattr(settings, key) for key in fields}
    value["default_endpoints"] = [settings.voyage_base_url, settings.embedding_openai_base_url]
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()
