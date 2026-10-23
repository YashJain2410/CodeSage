import uuid
import networkx as nx

from app.core.agent.graph import graph
from app.core.llm.factory import resolve_model
from app.core.agent.state import AgentState
from app.observability.langsmith import CodeSageCallbackHandler, query_tracing
from app.observability.metrics import QUERY_COUNT
from app.core.runtime.application_state import app_state


class QueryService:

    def __init__(
            self,
            call_graph: nx.MultiDiGraph,
    ):
        self.call_graph = call_graph
        self.state = app_state

    
    def _build_initial_state(
            self,
            query: str,
            provider: str,
            model: str,
    ) -> AgentState:
        
        return {
            "query": query,

            "intent": None,

            "seed_results": [],

            "expanded_results": [],

            "ranked_results": [],

            "assembled_context": None,

            "answer": None,

            "citations": [],

            "confidence": 0.0,

            "retry_count": 0,

            "trace_id": str(uuid.uuid4()),

            "graph": self.state.graph,

            "model_provider": provider,

            "model_name": model,

            "retrieved_func_ids": [],
        }
    

    def answer(
            self,
            query: str,
            provider: str | None = None,
            model: str | None = None,
    ):
        provider, model = resolve_model(provider, model)
        state = self._build_initial_state(
            query,
            provider,
            model,
        )

        handler = CodeSageCallbackHandler()

        with query_tracing():
            result = graph.invoke(
                state,
                config = {
                    "callbacks": [handler],
                    "run_name": "CodeSage query",
                    "run_id": uuid.UUID(state["trace_id"]),
                },
            )

        QUERY_COUNT.inc()

        return result
