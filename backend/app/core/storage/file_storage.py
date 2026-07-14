from pathlib import Path
from uuid import uuid4
import zipfile
import shutil


class FileStorage:

    def __init__(self):

        self.root = Path("workspaces")

        self.root.mkdir(
            parents=True,
            exist_ok=True,
        )

    def create_workspace(self):

        workspace = self.root / str(uuid4())

        workspace.mkdir(
            parents=True,
            exist_ok=True,
        )

        return workspace

    def save_zip(
        self,
        zip_path: Path,
        workspace: Path,
    ):

        with zipfile.ZipFile(zip_path) as z:

            z.extractall(workspace)

        return workspace

    def delete_workspace(
        self,
        workspace: Path,
    ):

        if workspace.exists():

            shutil.rmtree(workspace)


file_storage = FileStorage()