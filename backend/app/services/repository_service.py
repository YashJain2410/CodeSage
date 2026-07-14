from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud.repository import repository_crud
from app.core.storage.file_storage import file_storage
from app.services.index_service import index_service


class RepositoryService:

    async def upload_zip(
        self,
        db: AsyncSession,
        file: UploadFile,
    ):

        # --------------------------------------------------
        # Create workspace
        # --------------------------------------------------

        workspace = file_storage.create_workspace()

        # --------------------------------------------------
        # Save uploaded zip
        # --------------------------------------------------

        zip_path = workspace / file.filename

        with zip_path.open("wb") as buffer:
            buffer.write(await file.read())

        # --------------------------------------------------
        # Extract zip
        # --------------------------------------------------

        file_storage.save_zip(
            zip_path,
            workspace,
        )

        zip_path.unlink()

        # --------------------------------------------------
        # Detect actual repository root
        # --------------------------------------------------

        children = [
            path
            for path in workspace.iterdir()
            if path.is_dir()
        ]

        repo_root = (
            children[0]
            if len(children) == 1
            else workspace
        )

        # --------------------------------------------------
        # Index repository
        # --------------------------------------------------

        runtime = index_service.index_repository(
            str(repo_root)
        )

        # --------------------------------------------------
        # Create repository record
        # --------------------------------------------------

        repository = await repository_crud.create(
            db=db,
            name=repo_root.name,
            source_type="zip",
            workspace_path=str(workspace),
        )

        # --------------------------------------------------
        # Calculate repository size
        # --------------------------------------------------

        size_bytes = sum(
            file.stat().st_size
            for file in repo_root.rglob("*")
            if file.is_file()
        )

        # --------------------------------------------------
        # Update repository statistics
        # --------------------------------------------------

        await repository_crud.complete_indexing(
            db=db,
            repository_id=repository.id,
            language="python",
            node_count=runtime["stats"]["nodes"],
            edge_count=runtime["stats"]["edges"],
            file_count=len(runtime["units"]),
            size_bytes=size_bytes,
        )

        # --------------------------------------------------
        # Return response
        # --------------------------------------------------

        return {
            "repository_id": repository.id,
            "status": "READY",
            "nodes": runtime["stats"]["nodes"],
            "edges": runtime["stats"]["edges"],
        }


repository_service = RepositoryService()