from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.db.crud.repository import repository_crud
from app.core.storage.file_storage import file_storage
from app.services.index_service import index_service
from app.repositories.github import GithubRepository


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

        return await self._index_repository(
            db=db,
            workspace=workspace,
            repo_root=repo_root,
            source_type="zip",
        )


    async def import_github(
        self,
        db: AsyncSession,
        github_url: str,
    ):

        github = GithubRepository()
        github_url = github.validate_url(github_url)
        workspace = file_storage.create_workspace()
        repo_root = workspace / github_url.rsplit("/", 1)[-1]

        try:

            await run_in_threadpool(
                github.clone,
                github_url,
                repo_root,
            )

            return await self._index_repository(
                db=db,
                workspace=workspace,
                repo_root=repo_root,
                source_type="github",
                github_url=github_url,
            )

        except Exception:
            await db.rollback()
            file_storage.delete_workspace(workspace)
            raise


    async def _index_repository(
        self,
        db: AsyncSession,
        workspace: Path,
        repo_root: Path,
        source_type: str,
        github_url: str | None = None,
    ):

        runtime = index_service.index_repository(
            str(repo_root)
        )

        # --------------------------------------------------
        # Create repository record
        # --------------------------------------------------

        repository = await repository_crud.create(
            db=db,
            name=repo_root.name,
            source_type=source_type,
            workspace_path=str(workspace),
            github_url=github_url,
        )

        # --------------------------------------------------
        # Calculate repository size
        # --------------------------------------------------

        size_bytes = sum(
            file.stat().st_size
            for file in repo_root.rglob("*")
            if file.is_file() and ".git" not in file.relative_to(repo_root).parts
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
