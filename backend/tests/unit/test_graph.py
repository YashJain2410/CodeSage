import networkx as nx

from app.core.graph.builder import CallGraphBuilder
from app.core.parser.base import CodeUnit
from app.core.parser.import_resolver import ImportResolver
from app.core.graph.queries import GraphQueries

builder = CallGraphBuilder()

units = [
    CodeUnit(
        id="a.py::process",
        name="process",
        qualified_name="process",
        filepath="a.py",
        start_line=1,
        end_line=3,
        source="",
        docstring=None,
        calls=["validate"],
        decorators=[],
        is_test=False,
        node_type="function"
    ),

    CodeUnit(
        id="b.py::validate",
        name="validate",
        qualified_name="validate",
        filepath="b.py",
        start_line=1,
        end_line=2,
        source="",
        docstring=None,
        calls=[],
        decorators=[],
        is_test=False,
        node_type="function"
    )
]

resolver = ImportResolver(".")

G = builder.build(units, resolver)

# print(G.edges(data=True))

queries = GraphQueries(G)

print(
    queries.get_callers("b.py::validate")
)

print(
    queries.get_callees("a.py::process")
)