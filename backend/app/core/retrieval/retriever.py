import time

from app.core.indexer.embedder import CodeEmbedder
from app.core.indexer.qdrant_store import QdrantCodeStore

from app.core.graph.queries import GraphQueries

class HybridRetriever:

    def __init__(self, graph):

        self.graph = graph

        self.graph_queries = GraphQueries(graph)

        self.embedder = CodeEmbedder()

        self.vector_store = QdrantCodeStore()

    
    def semantic_search(self, query, top_k = 5):

        query_embedding = self.embedder.embed_text(query)

        results = self.vector_store.search(query_embedding, top_k = top_k)

        return results
    

    def expand_graph_context(self, func_id, depth = 1):

        related = set()

        neighbors = self.graph_queries.get_neighbors(func_id)

        for n in neighbors:
            related.add(n)

        return list(related)
    

    def hybrid_search(self, query, top_k = 5):

        semantic_results = self.semantic_search(query, top_k)

        expanded = []

        for result in semantic_results:

            func_id = result.payload["func_id"]

            expanded.append(func_id)

            neighbors = self.expand_graph_context(func_id)

            expanded.extend(neighbors)

        unique = list(set(expanded))

        return unique
    

    def rank_results(
            self,
            semantic_results,
            expanded_results
    ):
        scores = []

        for idx, result in enumerate(semantic_results):

            func_id = result.payload["func_id"]

            scores[func_id] = (
                scores.get(func_id, 0) + (100 - idx)
            )

        for func_id in expanded_results:

            scores[func_id] = (
                scores.get(func_id, 0) + 10
            )

        ranked = sorted(
            scores.items(),
            key = lambda x: x[1],
            reverse = True
        )

        return ranked
    

    def retrieve(self, query, top_k = 5):

        start = time.time()
        semantic_results = self.semantic_search(query, top_k)
        expanded = []

        for result in semantic_results:

            func_id = result.payload["func_id"]

            neighbors = self.expand_graph_context(func_id)

            expanded.extend(neighbors)

        ranked = self.rank_results(
            semantic_results,
            expanded
        )

        latency = ( time.time() - start ) * 1000
        print(f"Retrieval took {latency:.2f}ms")

        return ranked