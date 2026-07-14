from app.core.agent.state import AgentState

from app.core.retrieval.intent import QueryIntentClassifier
from app.core.retrieval.hybrid import HybridRetriever
from app.core.retrieval.graph_expander import GraphExpander
from app.core.retrieval.reranker import CrossEncoderReranker
from app.core.retrieval.context_assembler import ContextAssembler
from app.core.llm.factory import get_llm
from app.core.agent.prompts import (
    SYSTEM_PROMPT,
    HUMAN_TEMPLATE,
    INTENT_SYSTEM_PROMPTS
)
from app.observability.metrics import MODEL_USAGE, LLM_LATENCY, CONFIDENCE_SCORE
from app.core.runtime.application_state import app_state

import time


classifier = QueryIntentClassifier()
reranker = CrossEncoderReranker()
assembler = ContextAssembler()


# --------------------------------------------------
# Intent Classification
# --------------------------------------------------

def classify_intent_node(
    state: AgentState
) -> AgentState:

    result = classifier.classify(
        state["query"]
    )

    state["intent"] = result.intent

    return state


# --------------------------------------------------
# Hybrid Retrieval
# --------------------------------------------------

def retrieve_node(
    state: AgentState
) -> AgentState:

    results = app_state.retriever.search(
        query=state["query"]
    )

    state["seed_results"] = results

    return state


# --------------------------------------------------
# Graph Expansion
# --------------------------------------------------

def expand_graph_node(
    state: AgentState
) -> AgentState:

    graph = state["graph"]

    expander = GraphExpander(graph)

    expanded = []

    for result in state["seed_results"]:

        if isinstance(result, tuple):
            func_id = result[0]

        elif isinstance(result, dict):
            func_id = result["func_id"]

        else:
            func_id = result

        print("Graph nodes:", len(graph.nodes))
        print("First node:", next(iter(graph.nodes)))
        print("Retrieved id:", func_id)

        expanded.extend(
            expander.expand(
                func_id,
                state["intent"]
            )
        )

    state["expanded_results"] = list(
        set(expanded)
    )

    return state


# --------------------------------------------------
# Reranking
# --------------------------------------------------

def rerank_node(
    state: AgentState
) -> AgentState:

    graph = state["graph"]

    ranked = reranker.rerank(
        query=state["query"],
        candidates=state["expanded_results"],
        graph=graph
    )

    state["ranked_results"] = ranked

    state["retrieved_func_ids"] = [
        func_id
        for func_id, _
        in ranked
    ]

    return state


# --------------------------------------------------
# Context Assembly
# --------------------------------------------------

def assemble_context_node(
    state: AgentState
) -> AgentState:

    graph = state["graph"]

    context = assembler.assemble(
        ranked_nodes=state["ranked_results"],
        graph=graph
    )

    state["assembled_context"] = context

    return state


# --------------------------------------------------
# Answer Generation
# --------------------------------------------------

def generate_answer_node(
    state: AgentState
) -> AgentState:

    llm = get_llm(
        state["model_provider"],
        state["model_name"],
    )

    extra_prompt = INTENT_SYSTEM_PROMPTS.get(
        state["intent"],
        ""
    )

    system_prompt = (
        SYSTEM_PROMPT
        + "\n"
        + extra_prompt
    )

    user_prompt = HUMAN_TEMPLATE.format(
        query = state["query"],
        context = state["assembled_context"],
    )

    start = time.time()

    answer = llm.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )

    latency_ms = (
        time.time() - start
    ) * 1000

    state["answer"] = answer
    state["citations"] = []
    state["confidence"] = 1.0

    MODEL_USAGE.labels(
        provider=state["model_provider"],
        model=state["model_name"]
    ).inc()

    LLM_LATENCY.observe(
        latency_ms
    )

    CONFIDENCE_SCORE.observe(
        state["confidence"]
    )

    return state


# --------------------------------------------------
# Confidence Check
# --------------------------------------------------

def check_confidence_node(
    state: AgentState
) -> AgentState:

    return state