import networkx as nx


class GraphSerializer:

    @staticmethod
    def to_dict(graph: nx.MultiDiGraph):

        nodes = []

        for node_id, data in graph.nodes(data=True):

            nodes.append(
                {
                    "id": node_id,
                    "label": data.get("name"),
                    "filepath": data.get("filepath"),
                    "node_type": data.get("node_type"),
                    "is_test": data.get("is_test", False),
                    "start_line": data.get("start_line"),
                    "end_line": data.get("end_line"),
                }
            )

        edges = []

        for source, target, data in graph.edges(data=True):

            edges.append(
                {
                    "source": source,
                    "target": target,
                    "edge_type": data.get("edge_type"),
                    "resolved": data.get("resolved", False),
                }
            )

        return {
            "nodes": nodes,
            "edges": edges,
        }