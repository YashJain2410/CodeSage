from sentence_transformers import CrossEncoder
from app.observability.metrics import RERANK_LATENCY
import time


class CrossEncoderReranker:

    def __init__(
            self,
            model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    ):
        self.model = CrossEncoder(model_name)


    def build_candidate_text(self, node_data):

        return f"""
Function:
{node_data.get('qualified_name')}

Docstring:
{node_data.get('docstring')}

Source:
{node_data.get('source')}
"""
    

    def rerank(self, query, candidates, graph, top_k = 20):

        pairs = []
        valid_nodes = []

        for func_id in candidates:

            if func_id not in graph.nodes:
                continue

            node_data = graph.nodes[func_id]

            candidate_text = (
                self.build_candidate_text(node_data)
            )

            pairs.append(
                (
                    query,
                    candidate_text
                )
            )

            valid_nodes.append(func_id)

        start = time.time()

        scores = self.model.predict(pairs)

        latency_ms = (
            time.time() - start
        ) * 1000

        ranked = sorted(
            zip(valid_nodes, scores),
            key = lambda x: x[1],
            reverse = True
        )

        RERANK_LATENCY.observe(
            latency_ms
        )

        return ranked[:top_k]