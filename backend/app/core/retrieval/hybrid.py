from collections import defaultdict

from rank_bm25 import BM25Okapi

from app.core.indexer.embedder import CodeEmbedder
from app.core.indexer.qdrant_store import QdrantCodeStore
from app.observability.metrics import RETRIEVAL_LATENCY, RETRIEVED_DOCUMENTS

import time


class HybridRetriever:

    def __init__(self):

        self.embedder = CodeEmbedder()
        self.vector_store = QdrantCodeStore()
        self.bm25 = None
        self.documents = []


    def build_bm25_index(self, documents):
        
        self.documents = documents

        tokenized = [
            doc["text"].lower().split()
            for doc in documents
        ]

        self.bm25 = BM25Okapi(tokenized)


    def bm25_search(self, query: str, top_k: int = 10):

        if not self.bm25:
            raise ValueError("BM25 index not built")
        
        tokens = query.lower().split()

        scores = self.bm25.get_scores(tokens)

        ranked = sorted(
            enumerate(scores),
            key = lambda x: x[1],
            reverse=True
        )

        results = []

        for idx, score in ranked[:top_k]:

            results.append({
                "func_id": self.documents[idx]["func_id"],
                "score": float(score)
            })

        return results
    

    def dense_search(self, query: str, top_k: int = 10):

        embedding = self.embedder.embed_text(query)

        results = self.vector_store.search(
            embedding,
            top_k = top_k
        )

        formatted = []

        for result in results:

            formatted.append({
                "func_id": result.payload["func_id"],
                "score": result.score
            })
        
        return formatted
    

    def rrf_fusion(
            self,
            bm25_results,
            dense_results,
            k: int = 60
    ):
        
        scores = defaultdict(float)

        for rank, result in enumerate(bm25_results):

            scores[result["func_id"]] += 1 / (k + rank + 1)

        for rank, result in enumerate(dense_results):

            scores[result["func_id"]] += 1 / (k + rank + 1)

        ranked = sorted(
            scores.items(),
            key = lambda x: x[1],
            reverse=True
        )

        return ranked
    

    def search(
            self,
            query: str,
            top_k: int = 10
    ):
        start = time.time()
        
        bm25_results = self.bm25_search(query, top_k)
        dense_results = self.dense_search(query, top_k)
        fused = self.rrf_fusion(bm25_results, dense_results)

        latency_ms = (
            time.time() - start
        ) * 1000

        RETRIEVAL_LATENCY.observe(
            latency_ms
        )

        RETRIEVED_DOCUMENTS.observe(
            len(fused)
        )

        return fused[:top_k]