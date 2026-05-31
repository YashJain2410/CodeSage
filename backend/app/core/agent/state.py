from typing import TypedDict

from app.core.retrieval.intent import QueryIntent


class AgentState(TypedDict):
    
    query: str
    intent: QueryIntent | None
    seed_results: list
    expanded_results: list
    ranked_results: list
    assembled_context: str | None
    answer: str | None
    citations: list
    confidence: float
    retry_count: int
    trace_id: str