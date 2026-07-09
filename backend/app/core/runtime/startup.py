from app.core.runtime.application_state import app_state
from app.core.indexer.pipeline import IndexingPipeline


def initialize_application(
        repo_path: str,
):
    
    pipeline = IndexingPipeline()

    runtime = pipeline.index_repository(repo_path)

    app_state.graph = runtime["graph"]

    app_state.repo_path = repo_path

    app_state.retriever.build_bm25_index(runtime["documents"])

    app_state.is_initialized = True

    return app_state