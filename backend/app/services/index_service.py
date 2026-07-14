from app.core.indexer.pipeline import IndexingPipeline
from app.core.runtime.application_state import app_state


class IndexService:

    def __init__(self):
        self.pipeline = IndexingPipeline()

    def index_repository(
        self,
        workspace_path: str,
    ):

        runtime = self.pipeline.index_repository(
            workspace_path
        )

        app_state.graph = runtime["graph"]
        app_state.repo_path = workspace_path

        app_state.retriever.build_bm25_index(
            runtime["documents"]
        )

        app_state.is_initialized = True

        return runtime


index_service = IndexService()