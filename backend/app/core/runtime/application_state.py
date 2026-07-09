from app.core.retrieval.hybrid import HybridRetriever
import networkx as nx


class ApplicationState:

    def __init__(self):

        self.graph: nx.MultiDiGraph | None = None

        self.retriever = HybridRetriever()

        self.repo_path: str | None = None

        self.is_initialized = False


app_state = ApplicationState()