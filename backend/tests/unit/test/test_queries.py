import networkx as nx

from app.core.graph.queries import GraphQueries


def test_get_callers():

    G = nx.MultiDiGraph()

    G.add_edge(
        "a.py::process",
        "b.py::validate"
    )

    queries = GraphQueries(G)

    result = queries.get_callers(
        "b.py::validate"
    )

    assert result == ["a.py::process"]


def test_get_callees():

    G = nx.MultiDiGraph()

    G.add_edge(
        "a.py::process",
        "b.py::validate"
    )

    queries = GraphQueries(G)

    result = queries.get_callees(
        "a.py::process"
    )

    assert result == ["b.py::validate"]


def test_get_neighbors():

    G = nx.MultiDiGraph()

    G.add_edge("a", "b")
    G.add_edge("c", "a")

    queries = GraphQueries(G)

    result = queries.get_neighbors("a")

    assert set(result) == {"b", "c"}