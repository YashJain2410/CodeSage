from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
)

from app.config import get_settings
from app.db.base import Base

settings = get_settings()

DATABASE_URL = settings.database_url.replace(
    "postgresql://",
    "postgresql+asyncpg://",
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)