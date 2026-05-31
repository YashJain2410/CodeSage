import networkx as nx

from app.core.retrieval.intent import QueryIntent
from app.core.agent.nodes import expand_node

from app.core.agent.nodes import classify_intent_node

from unittest.mock import patch
from app.core.agent.nodes import retrieve_node
from app.core.agent.nodes import rerank_node
from app.core.agent.nodes import assemble_context_node


def test_expand_node():

    graph = nx.DiGraph()

    graph.add_edge(
        "api_handler",
        "login_user"
    )

    graph.add_edge(
        "login_user",
        "validate_credentials"
    )

    state = {
        "query": "why does login fail",
        "intent": QueryIntent.BUG,
        "graph": graph,
        "retrieved_nodes": [
            ("login_user", 0.95)
        ]
    }

    result = expand_node(state)

    expanded = result["expanded_nodes"]

    assert "login_user" in expanded
    assert "api_handler" in expanded
    assert "validate_credentials" in expanded


def test_classify_bug():

    state = {
        "query": "why does login fail"
    }

    result = classify_intent_node(state)

    assert result["intent"] == QueryIntent.BUG


@patch(
    "app.core.agent.nodes.retriever.search"
)
def test_retrieve_node(mock_search):

    mock_search.return_value = [
        ("login_user", 0.91)
    ]

    state = {
        "query": "login failure"
    }

    result = retrieve_node(state)

    assert result["retrieved_nodes"] == [
        ("login_user", 0.91)
    ]


@patch(
    "app.core.agent.nodes.reranker.rerank"
)
def test_rerank_node(mock_rerank):

    mock_rerank.return_value = [
        ("login_user", 0.99)
    ]

    state = {
        "query": "login failure",
        "graph": nx.DiGraph(),
        "expanded_nodes": [
            "login_user"
        ]
    }

    result = rerank_node(state)

    assert result["reranked_nodes"] == [
        ("login_user", 0.99)
    ]


@patch(
    "app.core.agent.nodes.assembler.assemble"
)
def test_assemble_context_node(mock_assemble):

    mock_assemble.return_value = (
        "login_user validates credentials"
    )

    state = {
        "graph": nx.DiGraph(),
        "reranked_nodes": [
            ("login_user", 0.95)
        ]
    }

    result = assemble_context_node(state)

    assert (
        result["context"]
        == "login_user validates credentials"
    )