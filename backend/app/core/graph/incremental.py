import hashlib
import json
from pathlib import Path
from typing import Callable

import networkx as nx

from app.core.graph.builder import CallGraphBuilder
from app.core.parser.import_resolver import ImportResolver


def file_hash(filepath: str) -> str:

    with open(filepath, "rb") as f:
        content = f.read()

    return hashlib.sha256(content).hexdigest()


class IncrementalIndexer:

    def load_hash_cache(
        self,
        cache_path: str
    ) -> dict[str, str]:

        if not Path(cache_path).exists():
            return {}

        with open(
            cache_path,
            "r",
            encoding="utf-8"
        ) as f:
            return json.load(f)

    def save_hash_cache(
        self,
        cache: dict[str, str],
        cache_path: str
    ) -> None:

        with open(
            cache_path,
            "w",
            encoding="utf-8"
        ) as f:
            json.dump(
                cache,
                f,
                indent=2
            )

    def get_changed_files(
        self,
        repo_path: str,
        cache: dict[str, str]
    ) -> tuple[
        list[str],
        list[str],
        list[str],
        dict[str, str]
    ]:

        repo = Path(repo_path)

        current = {}
        new_files = []
        modified_files = []

        for filepath in repo.rglob("*.py"):

            path_str = str(filepath)

            current_hash = file_hash(path_str)

            current[path_str] = current_hash

            if path_str not in cache:

                new_files.append(path_str)

            elif cache[path_str] != current_hash:

                modified_files.append(path_str)

        deleted_files = [
            path
            for path in cache
            if path not in current
        ]

        return (
            new_files,
            modified_files,
            deleted_files,
            current
        )

    def update_graph(
        self,
        G: nx.MultiDiGraph,
        changed_files: list[str],
        deleted_files: list[str],
        parser_factory: Callable,
        resolver: ImportResolver
    ) -> nx.MultiDiGraph:

        affected_files = set(
            changed_files + deleted_files
        )

        nodes_to_remove = []

        for node_id, data in G.nodes(data=True):

            filepath = data.get("filepath")

            if filepath in affected_files:

                nodes_to_remove.append(node_id)

        # Remove nodes and all attached edges
        G.remove_nodes_from(nodes_to_remove)

        builder = CallGraphBuilder()

        # Optional:
        # If your ImportResolver supports rebuilding,
        # do it here before parsing.
        #
        # Example:
        # resolver.rebuild()

        for filepath in changed_files:

            parser = parser_factory(filepath)

            if parser is None:
                continue

            try:

                with open(
                    filepath,
                    "r",
                    encoding="utf-8"
                ) as f:

                    source = f.read()

                units = parser.parse(
                    source,
                    filepath
                )

            except Exception as e:

                print(
                    f"Failed to parse "
                    f"{filepath}: {e}"
                )

                continue

            temp_graph = builder.build(
                units,
                resolver
            )

            G.add_nodes_from(
                temp_graph.nodes(data=True)
            )

            G.add_edges_from(
                temp_graph.edges(data=True)
            )

        builder.link_tests(
            G,
            resolver
        )

        return G