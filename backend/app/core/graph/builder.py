import networkx as nx

from app.core.parser.base import CodeUnit
from app.core.parser.import_resolver import ImportResolver

class CallGraphBuilder:

    def build(self, units: list[CodeUnit], resolver: ImportResolver) -> nx.DiGraph:

        G = nx.DiGraph()

        for unit in units:

            G.add_node(
                unit.id,

                name = unit.name,
                qualified_name = unit.qualified_name,

                filepath = unit.filepath,

                start_line = unit.start_line,
                end_line = unit.end_line,

                source = unit.source,
                docstring = unit.docstring,

                calls = unit.calls,
                decorators = unit.decorators,

                is_test = unit.is_test,
                node_type = unit.node_type,
                parent_class = unit.parent_class,
            )

        all_unit_ids = {unit.id for unit in units}

        for unit in units:

            namespace = {}

            for call in unit.calls:

                resolved = resolver.resolve_call(call, namespace, all_unit_ids)

                if resolved:
                    G.add_edge(unit.id, resolved, edge_type = "calls", resolved = True)

                else:
                    G.add_edge(unit.id, call, edge_type = "calls", resolved = False)

        return G