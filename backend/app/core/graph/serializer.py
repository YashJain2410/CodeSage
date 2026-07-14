import networkx as nx
from pathlib import Path


class GraphSerializer:

    @staticmethod
    def to_dict(graph: nx.MultiDiGraph, repo_root: str | None = None):

        nodes = []

        for node_id, data in graph.nodes(data=True):

            nodes.append(
                {
                    "id": node_id,
                    "label": data.get("name"),
                    "filepath": GraphSerializer._relative_path(
                        data.get("filepath"),
                        repo_root,
                    ),
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

    @staticmethod
    def _relative_path(filepath: str | None, repo_root: str | None):
        """Return paths suitable for display without exposing workspace directories."""
        if not filepath or not repo_root:
            return filepath

        try:
            return Path(filepath).resolve().relative_to(Path(repo_root).resolve()).as_posix()
        except ValueError:
            return filepath
