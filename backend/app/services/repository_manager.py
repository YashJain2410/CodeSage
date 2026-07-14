from pathlib import Path
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud import repository_crud


class RepositoryManager:

    def __init__(self):
        self.workspace_root = Path("workspace")

        self.workspace_root.mkdir(
            parents=True,
            exist_ok=True,
        )


    async def create_repository(
        self,
        db: AsyncSession,
        *,
        name: str,
        source_type: str,
        github_url: str | None = None,
    ):

        workspace = (
            self.workspace_root /
            str(uuid4())
        )

        workspace.mkdir(
            parents=True,
            exist_ok=True,
        )

        repository = await repository_crud.create(
            db=db,
            name=name,
            source_type=source_type,
            workspace_path=str(workspace),
            github_url=github_url,
        )

        return repository