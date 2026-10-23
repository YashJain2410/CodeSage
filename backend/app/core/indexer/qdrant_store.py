import hashlib

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

from app.config import get_settings
from app.core.models.common import embedding_fingerprint
from app.core.llm.errors import ModelConfigurationError


class QdrantCodeStore:
    def __init__(self, url=None, collection_name=None, *, settings=None, vector_size=None):
        self.settings = (settings or get_settings()).model_copy(deep=True)
        url = self.settings.qdrant_url if url is None else url
        self.client = (QdrantClient(location=":memory:") if url == ":memory:" else
                       QdrantClient(url=url, api_key=self.settings.qdrant_api_key))
        self.embedding_signature = embedding_fingerprint(self.settings)
        # Keep every model/preprocessing configuration in its own vector space.
        prefix = collection_name or self.settings.qdrant_collection
        self.collection_name = f"{prefix}_{self.embedding_signature}"
        self.vector_size = vector_size or self.settings.embed_dimensions

    def _existing_size(self):
        config = self.client.get_collection(self.collection_name).config.params.vectors
        if not isinstance(config, VectorParams) or config.distance != Distance.COSINE:
            raise ModelConfigurationError("The embedding collection has an incompatible vector configuration. Reindex it.")
        return config.size

    def ensure_collection(self, vector_size=None):
        expected = vector_size or self.vector_size
        if self.client.collection_exists(self.collection_name):
            actual = self._existing_size()
            if expected is not None and expected != actual:
                raise ModelConfigurationError("Vector dimension does not match the index. Reindex with the selected embedding model.")
            self.vector_size = actual
            return
        if expected is None:
            raise ValueError("Supply an embedding vector size before creating a collection.")
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(size=expected, distance=Distance.COSINE))
        self.vector_size = expected

    def upsert_units(self, units, embeddings):
        array = np.asarray(embeddings, dtype=np.float32)
        if (array.ndim != 2 or len(array) != len(units) or not len(units)
                or array.shape[1] == 0 or not np.isfinite(array).all()
                or (np.linalg.norm(array, axis=1) == 0).any()):
            raise ValueError("Indexing requires one finite nonzero embedding per code unit.")
        self.ensure_collection(array.shape[1])
        points = []
        for unit, embedding in zip(units, array):
            payload = {"func_id": unit.id, "name": unit.name, "qualified_name": unit.qualified_name,
                       "filepath": unit.filepath, "start_line": unit.start_line, "end_line": unit.end_line,
                       "node_type": unit.node_type, "is_test": unit.is_test,
                       "source": unit.source, "docstring": unit.docstring,
                       "embedding_signature": self.embedding_signature}
            stable_id = int(hashlib.md5(unit.id.encode()).hexdigest(), 16) % (10 ** 12)
            points.append(PointStruct(id=stable_id, vector=embedding.tolist(), payload=payload))
        self.client.upsert(collection_name=self.collection_name, points=points)

    def search(self, query_embedding, top_k=5, filepath=None, is_test=None):
        vector = np.asarray(query_embedding, dtype=np.float32)
        if (vector.ndim != 1 or not len(vector) or not np.isfinite(vector).all()
                or np.linalg.norm(vector) == 0):
            raise ValueError("Query embedding must be a finite nonzero vector.")
        if not self.client.collection_exists(self.collection_name):
            raise ModelConfigurationError("No index exists for the selected embedding configuration. Reindex the repository.")
        if self._existing_size() != len(vector):
            raise ModelConfigurationError("Query embedding dimension does not match the index. Reindex the repository.")
        conditions = []
        if filepath:
            conditions.append(FieldCondition(key="filepath", match=MatchValue(value=filepath)))
        if is_test is not None:
            conditions.append(FieldCondition(key="is_test", match=MatchValue(value=is_test)))
        return self.client.query_points(
            collection_name=self.collection_name, query=vector.tolist(),
            query_filter=Filter(must=conditions) if conditions else None, limit=top_k).points

    def recreate_collection(self, vector_size=None):
        expected = vector_size or self.vector_size
        if expected is None:
            raise ValueError("Supply the embedding dimension before recreating an index.")
        # Validate before deleting: a failed model call must not erase the old index.
        if expected <= 0:
            raise ValueError("Embedding dimension must be positive.")
        if self.settings.embed_dimensions is not None and expected != self.settings.embed_dimensions:
            raise ValueError("Embedding dimension differs from EMBED_DIMENSIONS.")
        if self.client.collection_exists(self.collection_name):
            self.client.delete_collection(self.collection_name)
        self.vector_size = expected
        self.ensure_collection(expected)
