from app.core.parser import get_parser
from app.core.parser.import_resolver import ImportResolver

from app.core.graph.builder import CallGraphBuilder
from app.core.graph.queries import GraphQueries

from app.core.indexer.embedder import CodeEmbedder
from app.core.indexer.qdrant_store import QdrantCodeStore

from pathlib import Path

from app.core.indexer.experiment_tracker import ( ExperimentTracker )


class IndexingPipeline:

    def __init__(self):

        self.embedder = CodeEmbedder()
        self.vector_store = QdrantCodeStore()
        self.graph_builder = CallGraphBuilder()
        self.tracker = ExperimentTracker()

    def discover_files(self, repo_path):

        repo = Path(repo_path)

        supported = []

        extensions = {
            ".py",
            ".js",
            ".ts",
            ".tsx"
        }

        ignored_dirs = {
            "node_modules",
            ".git",
            "__pycache__",
            "venv"
        }

        for filepath in repo.rglob("*"):

            if not filepath.is_file():
                continue

            if filepath.suffix not in extensions:
                continue

            if any(
                part in ignored_dirs
                for part in filepath.parts
            ):
                continue

            supported.append(str(filepath))

        return supported
    

    def parse_repository(self, repo_path):

        files = self.discover_files(repo_path)

        all_units = []

        for filepath in files:
            parser = get_parser(filepath)

            if not parser:
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

                all_units.extend(units)

            except Exception as e:
                print(f"Failed parsing {filepath}: {e}")
        return all_units
    

    def build_index(self, repo_path):

        print("Parsing repository...")

        units = self.parse_repository(repo_path)

        print(f"Parsed {len(units)} units")

        resolver = ImportResolver(repo_path)

        print("Building graph...")

        graph = self.graph_builder.build(units, resolver)

        self.graph_builder.link_tests(graph, resolver)

        queries = GraphQueries(graph)

        print("Generating embeddings...")

        texts = []
        documents = []

        for unit in units:

            callers = queries.get_callers(unit.id)
            callees = queries.get_callees(unit.id)

            text = self.embedder.build_text_representation(unit, callers, callees)
            texts.append(text)

            documents.append(
                {
                    "func_id": unit.id,
                    "text": text,
                }
            )

        embeddings = self.embedder.embed_batch(texts)

        return (units, graph, embeddings, documents)
    

    def index_repository(self, repo_path):

        self.vector_store.ensure_collection()

        units, graph, embeddings, documents = self.build_index(repo_path)

        print("Uploading vectors...")
        print(f"Units: {len(units)}")
        print(f"Embeddings: {len(embeddings)}")

        self.vector_store.upsert_units(units, embeddings)

        print("Indexing complete")

        stats = {
            "units": len(units),
            "nodes": len(graph.nodes),
            "edges": len(graph.edges)
        }

        self.tracker.track_indexing_run(
            stats,
            "microsoft/unixcoder-base",
            model_provider="gemini",
            model_name="gemini-3.5-flash"
        )

        return {
            "graph": graph,
            "units": units,
            "documents": documents,
            "stats": {
                "units": len(units),
                "nodes": len(graph.nodes),
                "edges": len(graph.edges),
            },
        }
    

    def publish_progress(self, current, total, message):
        percent = round(
            current / total * 100,
            2
        )

        print(f"[{percent}%] {message}")