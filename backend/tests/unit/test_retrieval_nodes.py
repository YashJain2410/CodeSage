from unittest.mock import patch

import networkx as nx

from app.core.retrieval.intent import QueryIntent

# Node tests use test doubles instead of downloading models or calling providers.
with patch("app.core.indexer.embedder.CodeEmbedder.__init__", return_value=None), \
     patch("app.core.retrieval.reranker.CrossEncoderReranker.__init__", return_value=None):
    from app.core.agent import nodes


def test_expand_graph_node():
    graph = nx.MultiDiGraph()
    graph.add_edge("api_handler", "login_user")
    graph.add_edge("login_user", "validate_credentials")
    state = {
        "query": "why does login fail",
        "intent": QueryIntent.BUG,
        "graph": graph,
        "seed_results": [("login_user", 0.95)],
    }

    result = nodes.expand_graph_node(state)

    assert {"login_user", "api_handler", "validate_credentials"} <= set(
        result["expanded_results"]
    )


def test_classify_bug():
    result = nodes.classify_intent_node({"query": "why does login fail"})
    assert result["intent"] == QueryIntent.BUG


def test_retrieve_node():
    with patch.object(nodes.app_state.retriever, "search", return_value=[("login_user", 0.91)]):
        result = nodes.retrieve_node({"query": "login failure"})

    assert result["seed_results"] == [("login_user", 0.91)]


def test_rerank_node():
    with patch.object(nodes.reranker, "rerank", return_value=[("login_user", 0.99)]):
        result = nodes.rerank_node({
            "query": "login failure",
            "graph": nx.MultiDiGraph(),
            "expanded_results": ["login_user"],
        })

    assert result["ranked_results"] == [("login_user", 0.99)]
    assert result["retrieved_func_ids"] == ["login_user"]


def test_assemble_context_node():
    with patch.object(nodes.assembler, "assemble", return_value="login_user validates credentials"):
        result = nodes.assemble_context_node({
            "graph": nx.MultiDiGraph(),
            "ranked_results": [("login_user", 0.95)],
        })

    assert result["assembled_context"] == "login_user validates credentials"
