from uuid import uuid4
from datetime import datetime

from sqlalchemy import (
    String,
    Integer,
    DateTime,
)

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from app.db.base import Base


class Repository(Base):

    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    name: Mapped[str] = mapped_column(String)

    source_type: Mapped[str] = mapped_column(String)

    status: Mapped[str] = mapped_column(String)

    progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    current_step: Mapped[str] = mapped_column(
        String,
        default="Pending",
    )

    workspace_path: Mapped[str] = mapped_column(String)

    github_url: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    language: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    node_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    edge_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    file_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    size_bytes: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    indexed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )