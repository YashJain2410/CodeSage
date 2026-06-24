from typing import TypedDict
import networkx as nx

from app.core.retrieval.intent import QueryIntent


class AgentState(TypedDict):

    query: str
    intent: QueryIntent | None
    seed_results: list[str]
    expanded_results: list[str]
    ranked_results: list[tuple[str, float]]
    assembled_context: str | None
    answer: str | None
    citations: list[str]
    confidence: float
    retry_count: int
    trace_id: str
    graph: nx.MultiDiGraph
    model_provider: str
    model_name: str
    retrieved_func_ids: list[str]