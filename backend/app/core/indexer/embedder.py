from functools import cached_property
import hashlib
import json

from diskcache import Cache
import numpy as np

from app.config import get_settings
from app.core.llm.errors import ModelConfigurationError, ModelRequestError
from app.core.models.embeddings import create_embedding_backend


class CodeEmbedder:
    """Shared document/query preprocessing independent of the inference provider."""

    def __init__(self, model_name=None, *, settings=None, backend=None):
        self.settings = (settings or get_settings()).model_copy(deep=True)
        if model_name is not None:
            self.settings.embed_model = model_name
        self.model_name = self.settings.embed_model
        self._backend = backend
        self._dimension = self.settings.embed_dimensions

    @cached_property
    def backend(self):
        return self._backend or create_embedding_backend(self.settings)

    @cached_property
    def cache(self):
        return Cache(self.settings.embedding_cache_path)

    @property
    def dimension(self):
        return self._dimension

    @property
    def fingerprint(self):
        from app.core.models.common import embedding_fingerprint
        return embedding_fingerprint(self.settings)

    def build_text_representation(self, unit, callers=None, callees=None):
        limit = self.settings.embedding_source_max_chars
        source = unit.source if limit is None else unit.source[:limit]
        neighbors = self.settings.embedding_graph_neighbors
        return (f"Function: {unit.name}\n\nFile: {unit.filepath}\n\nDocstring:\n{unit.docstring}\n\n"
                f"Called By:\n{', '.join((callers or [])[:neighbors])}\n\n"
                f"Calls:\n{', '.join((callees or [])[:neighbors])}\n\nSource:\n{source}")

    def _encode(self, texts, *, query=False, batch_size=None):
        if not texts:
            return np.empty((0, self.dimension or 0), dtype=np.float32)
        if any(not isinstance(text, str) or not text.strip() for text in texts):
            raise ValueError("Embedding inputs must be nonempty strings.")
        size = self.settings.embed_batch_size if batch_size is None else batch_size
        if size <= 0:
            raise ValueError("Embedding batch size must be positive.")
        prefix = self.settings.embed_query_prefix if query else self.settings.embed_document_prefix
        vectors = []
        for start in range(0, len(texts), size):
            batch = [prefix + text for text in texts[start:start + size]]
            try:
                array = np.asarray(self.backend.encode(batch, query=query), dtype=np.float32)
            except ModelConfigurationError:
                raise
            except (TypeError, ValueError):
                raise ModelRequestError("Embedding model returned invalid vectors.") from None
            if (array.ndim != 2 or array.shape[0] != len(batch) or array.shape[1] == 0
                    or not np.isfinite(array).all()):
                raise ModelRequestError("Embedding model returned invalid shape or non-finite values.")
            if self._dimension is not None and array.shape[1] != self._dimension:
                raise ModelRequestError("Embedding dimension changed. Check configuration and reindex the repository.")
            norms = np.linalg.norm(array, axis=1, keepdims=True)
            if (norms == 0).any() or not np.isfinite(norms).all():
                raise ModelRequestError("Embedding model returned a zero or invalid vector.")
            self._dimension = array.shape[1]
            vectors.append(array / norms)
        return np.concatenate(vectors)

    def embed_text(self, text):
        """Embed a search query (not a document)."""
        return self._encode([text], query=True)[0]

    def embed_batch(self, texts, batch_size=None):
        """Embed repository documents using the provider's document mode."""
        return self._encode(list(texts), batch_size=batch_size)

    def make_cache_key(self, unit_id, text):
        return hashlib.sha256(json.dumps([self.fingerprint, unit_id, text]).encode()).hexdigest()

    def embed_with_cache(self, unit, text):
        key = self.make_cache_key(unit.id, text)
        if key in self.cache:
            # Validate cached data too, without querying the inference provider.
            return np.asarray(self.cache[key], dtype=np.float32)
        embedding = self.embed_batch([text])[0]
        self.cache[key] = embedding
        return embedding
