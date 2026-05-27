import networkx as nx

from app.core.graph.builder import CallGraphBuilder
from app.core.parser.base import CodeUnit
from app.core.parser.import_resolver import ImportResolver
from app.core.graph.queries import GraphQueries
from app.core.graph.incremental import IncrementalIndexer

builder = CallGraphBuilder()

units = [
    CodeUnit(
        id="auth.py::login",
        name="login",
        qualified_name="login",
        filepath="auth.py",

        start_line=1,
        end_line=3,
        source="def login(): pass",

        calls=[],
        is_test=False,
        node_type="function"
    ),

    CodeUnit(
        id="test_auth.py::test_login",
        name="test_login",
        qualified_name="test_login",
        filepath="test_auth.py",

        start_line=1,
        end_line=5,
        source="""
def test_login():
    login()
""",

        calls=["login"],
        is_test=True,
        node_type="function"
    ),

    CodeUnit(
        id="auth.py::logout",
        name="logout",
        qualified_name="logout",
        filepath="auth.py",

        start_line=5,
        end_line=7,

        source="def logout(): pass",

        calls=[],
        is_test=False,
        node_type="function"
    )
]

resolver = ImportResolver(".")

G = builder.build(units, resolver)

builder.link_tests(G, resolver)

print(G.edges(data=True))

queries = GraphQueries(G)

print(queries.get_uncovered_functions())

# # print(
# #     queries.get_uncovered_functions()
# # )

# indexer = IncrementalIndexer()

# cache = {}

# print(indexer.get_changed_files(".", cache))

# print(G.edges(data=True))

# queries = GraphQueries(G)

# print(
#     queries.get_callers("b.py::validate")
# )

# print(
#     queries.get_callees("a.py::process")
# )