from app.core.graph.queries import GraphQueries

queries = GraphQueries(G)

print(
    queries.get_callers("b.py::validate")
)

print(
    queries.get_callees("a.py::process")
)