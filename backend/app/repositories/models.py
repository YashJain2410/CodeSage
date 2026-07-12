from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.repositories.enums import (
    RepositorySource,
    RepositoryStatus,
)


@dataclass
class Repository:

    id: str

    name: str

    source_type: RepositorySource

    status: RepositoryStatus

    workspace: Path

    created_at: datetime