from app.core.agent.state import AgentState

from app.core.retrieval.intent import QueryIntentClassifier
from app.core.retrieval.hybrid import HybridRetriever
from app.core.retrieval.graph_expander import GraphExpander
from app.core.retrieval.reranker import CrossEncoderReranker
from app.core.retrieval.context_assembler import ContextAssembler


classifier = QueryIntentClassifier()
retriever = HybridRetriever()
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

    results = retriever.search(
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

    # Placeholder until LLM integration

    state["answer"] = (
        "Answer generation not yet implemented."
    )

    state["citations"] = []

    state["confidence"] = 1.0

    return state


# --------------------------------------------------
# Confidence Check
# --------------------------------------------------

def check_confidence_node(
    state: AgentState
) -> AgentState:

    return state