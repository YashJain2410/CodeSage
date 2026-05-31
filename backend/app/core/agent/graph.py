from langgraph.graph import (
    StateGraph,
    END
)

from app.core.agent.state import AgentState

from app.core.agent.nodes import (
    classify_intent_node,
    retrieve_node,
    expand_graph_node,
    rerank_node,
    assemble_context_node,
    generate_answer_node,
    check_confidence_node,
)


workflow = StateGraph(AgentState)


# --------------------------------------------------
# Nodes
# --------------------------------------------------

workflow.add_node(
    "classify_intent",
    classify_intent_node
)

workflow.add_node(
    "retrieve",
    retrieve_node
)

workflow.add_node(
    "expand_graph",
    expand_graph_node
)

workflow.add_node(
    "rerank",
    rerank_node
)

workflow.add_node(
    "assemble_context",
    assemble_context_node
)

workflow.add_node(
    "generate_answer",
    generate_answer_node
)

workflow.add_node(
    "check_confidence",
    check_confidence_node
)


# --------------------------------------------------
# Entry Point
# --------------------------------------------------

workflow.set_entry_point(
    "classify_intent"
)


# --------------------------------------------------
# Main Pipeline
# --------------------------------------------------

workflow.add_edge(
    "classify_intent",
    "retrieve"
)

workflow.add_edge(
    "retrieve",
    "expand_graph"
)

workflow.add_edge(
    "expand_graph",
    "rerank"
)

workflow.add_edge(
    "rerank",
    "assemble_context"
)

workflow.add_edge(
    "assemble_context",
    "generate_answer"
)

workflow.add_edge(
    "generate_answer",
    "check_confidence"
)


# --------------------------------------------------
# Confidence Router
# --------------------------------------------------

def confidence_router(
    state: AgentState
):

    confidence = state["confidence"]

    retry_count = state["retry_count"]

    if confidence >= 0.8:
        return "accept"

    if retry_count >= 2:
        return "clarify"

    return "retry"


workflow.add_conditional_edges(
    "check_confidence",
    confidence_router,
    {
        "accept": END,

        "retry": "expand_graph",

        "clarify": END,
    }
)


# --------------------------------------------------
# Compile LAST
# --------------------------------------------------

graph = workflow.compile()