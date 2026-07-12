from pathlib import Path
import uuid
import shutil

class WorkspaceManager:

    def __init__(
            self,
            storage_root: Path = Path("storage/repositories"),
    ):
        
        self.storage_root = storage_root
        self.storage_root.mkdir(
            parents=True,
            exist_ok=True,
        )


    def create_workspace(self) -> Path:

        workspace = (
            self.storage_root / str(uuid.uuid4())
        )

        workspace.mkdir()

        (workspace / "source").mkdir()
        (workspace / "graph").mkdir()
        (workspace / "metadata").mkdir()
        (workspace / "embeddings").mkdir()
        (workspace / "cache").mkdir()

        return workspace
    

    def source_path(
            self,
            workspace: Path,
    ) -> Path:
        
        return workspace / "source"
    

    def graph_path(
        self,
        workspace: Path,
    ) -> Path:

        return workspace / "graph"


    def metadata_path(
        self,
        workspace: Path,
    ) -> Path:

        return workspace / "metadata"


    def embeddings_path(
        self,
        workspace: Path,
    ) -> Path:

        return workspace / "embeddings"


    def cleanup(
        self,
        workspace: Path,
    ):

        if workspace.exists():
            shutil.rmtree(workspace)