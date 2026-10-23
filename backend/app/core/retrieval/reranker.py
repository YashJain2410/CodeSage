from functools import cached_property
import time

from app.config import get_settings
from app.core.models.common import validate_ranking
from app.core.models.ranking import create_ranking_backend
from app.observability.metrics import RERANK_LATENCY


class CrossEncoderReranker:
    """Compatibility facade for configurable local or remote relevance scoring."""

    def __init__(self, model_name=None, *, settings=None, backend=None):
        self.settings = (settings or get_settings()).model_copy(deep=True)
        if model_name is not None:
            self.settings.rerank_model = model_name
        self._backend = backend

    @cached_property
    def backend(self):
        return self._backend or create_ranking_backend(self.settings)

    def build_candidate_text(self, node_data):
        source = node_data.get("source") or ""
        limit = self.settings.rerank_document_max_chars
        if limit is not None:
            source = source[:limit]
        return (f"Function:\n{node_data.get('qualified_name')}\n\n"
                f"Docstring:\n{node_data.get('docstring')}\n\nSource:\n{source}")

    def rerank(self, query, candidates, graph, top_k=None):
        limit = self.settings.rerank_top_k if top_k is None else top_k
        if limit < 0:
            raise ValueError("top_k must not be negative.")
        valid_nodes = list(dict.fromkeys(node for node in candidates if node in graph.nodes))
        valid_nodes = valid_nodes[:self.settings.rerank_max_candidates]
        if not valid_nodes or limit == 0:
            return []
        documents = [self.build_candidate_text(graph.nodes[node]) for node in valid_nodes]
        size = self.settings.rerank_batch_size
        ranked = []
        start = time.perf_counter()
        try:
            # Disabled scoring must preserve global input order across batch boundaries.
            if self.settings.rerank_provider == "none":
                return [(node, float(len(valid_nodes) - i)) for i, node in enumerate(valid_nodes)][:limit]
            for offset in range(0, len(documents), size):
                batch = documents[offset:offset + size]
                rows = self.backend.rank(query, batch)
                checked = validate_ranking([
                    {"index": index, "relevance_score": score} for index, score in rows
                ], len(batch))
                ranked.extend((valid_nodes[offset + index], score) for index, score in checked)
            return sorted(ranked, key=lambda item: item[1], reverse=True)[:limit]
        finally:
            RERANK_LATENCY.observe((time.perf_counter() - start) * 1000)
