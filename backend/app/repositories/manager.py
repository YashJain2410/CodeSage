from pathlib import Path
from fastapi import UploadFile
import shutil
from app.repositories.workspace import WorkspaceManager
from app.repositories.validator import RepositoryValidator
from app.repositories.extractor import RepositoryExtractor
from app.core.indexer.pipeline import IndexingPipeline


class RepositoryManager:

    def __init__(self):
        self.workspace = WorkspaceManager()
        self.validator = RepositoryValidator()
        self.extractor = RepositoryExtractor()


    def create_workspace(self):

        return self.workspace_manager.create_workspace()
    

    def upload_zip(
            self,
            zip_path: Path,
    ):
        workspace = self.workspace.create_workspace()

        source = self.workspace.source_path(workspace)

        self.extractor.extract_zip(
            zip_path,
            source,
        )

        return workspace
    

    def upload_folder(
        self,
        folder: Path,
    ):
        workspace = self.workspace.create_workspace()

        source = self.workspace.source_path(workspace)

        self.extractor.copy_folder(
            folder,
            source,
        )

        return workspace


    def upload_file(
        self,
        file_path: Path,
    ):
        self.validator.validate_extension(file_path)

        workspace = self.workspace.create_workspace()

        source = self.workspace.source_path(workspace)

        self.extractor.copy_file(
            file_path,
            source / file_path.name,
        )

        return workspace


    def clone_github(
        self,
        github_url: str,
    ):
        raise NotImplementedError


    def index_repository(
        self,
        workspace: Path,
    ):
        raise NotImplementedError
    

    def upload_zip_file(
        self,
        file: UploadFile,
    ):

        workspace = self.workspace.create_workspace()

        source = self.workspace.source_path(workspace)

        zip_path = workspace / file.filename

        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer,
            )

        self.extractor.extract_zip(
            zip_path,
            source,
        )

        zip_path.unlink()

        return self.index_repository(workspace)
    

    def upload_single_file(
        self,
        file: UploadFile,
    ):

        workspace = self.workspace.create_workspace()

        source = self.workspace.source_path(workspace)

        destination = source / file.filename

        with open(destination, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer,
            )

        return self.index_repository(workspace)
    

    def upload_text(
        self,
        filename: str,
        content: str,
    ):

        workspace = self.workspace.create_workspace()

        source = self.workspace.source_path(workspace)

        destination = source / filename

        destination.write_text(
            content,
            encoding="utf-8",
        )

        return self.index_repository(workspace)
    

    def index_repository(
        self,
        workspace,
    ):

        pipeline = IndexingPipeline()

        runtime = pipeline.index_repository(
            str(
                self.workspace.source_path(workspace)
            )
        )

        return {

            "workspace": str(workspace),

            "graph": runtime["graph"],

            "stats": runtime["stats"],
        }