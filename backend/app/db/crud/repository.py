from uuid import uuid4
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.repository import Repository


class RepositoryCRUD:

    async def create(
        self,
        db: AsyncSession,
        *,
        name: str,
        source_type: str,
        workspace_path: str,
        github_url: str | None = None,
    ) -> Repository:

        repository = Repository(
            id=str(uuid4()),
            name=name,
            source_type=source_type,
            status="CREATED",
            workspace_path=workspace_path,
            github_url=github_url,
        )

        db.add(repository)

        await db.commit()

        await db.refresh(repository)

        return repository


    async def get_by_id(
        self,
        db: AsyncSession,
        repository_id: str,
    ) -> Repository | None:

        result = await db.execute(

            select(Repository).where(
                Repository.id == repository_id
            )

        )

        return result.scalar_one_or_none()


    async def list(
        self,
        db: AsyncSession,
    ) -> list[Repository]:

        result = await db.execute(

            select(Repository)

        )

        return list(result.scalars().all())


    async def delete(
        self,
        db: AsyncSession,
        repository_id: str,
    ) -> bool:

        repository = await self.get_by_id(
            db,
            repository_id,
        )

        if repository is None:
            return False

        await db.delete(repository)

        await db.commit()

        return True
    

    async def update_status(
        self,
        db: AsyncSession,
        repository_id: str,
        *,
        status: str,
        progress: int,
        current_step: str,
    ) -> Repository | None:

        repository = await self.get_by_id(
            db,
            repository_id,
        )

        if repository is None:
            return None

        repository.status = status
        repository.progress = progress
        repository.current_step = current_step

        await db.commit()

        await db.refresh(repository)

        return repository
    

    async def complete_indexing(
        self,
        db: AsyncSession,
        repository_id: str,
        *,
        language: str,
        node_count: int,
        edge_count: int,
        file_count: int,
        size_bytes: int,
    ) -> Repository | None:

        repository = await self.get_by_id(
            db,
            repository_id,
        )

        if repository is None:
            return None

        repository.status = "READY"
        repository.progress = 100
        repository.current_step = "Completed"

        repository.language = language
        repository.node_count = node_count
        repository.edge_count = edge_count
        repository.file_count = file_count
        repository.size_bytes = size_bytes

        await db.commit()

        await db.refresh(repository)

        return repository
    

    async def mark_indexed(
        self,
        db: AsyncSession,
        repository_id: str,
        *,
        node_count: int,
        edge_count: int,
        file_count: int,
    ):

        repository = await self.get_by_id(
            db,
            repository_id,
        )

        if repository is None:
            return None

        repository.status = "READY"

        repository.progress = 100

        repository.current_step = "Completed"

        repository.node_count = node_count

        repository.edge_count = edge_count

        repository.file_count = file_count

        repository.indexed_at = datetime.utcnow()

        await db.commit()

        await db.refresh(repository)

        return repository
        

repository_crud = RepositoryCRUD()