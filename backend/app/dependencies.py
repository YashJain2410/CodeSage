from fastapi import Depends
from typing import Annotated

from app.config import get_settings, Settings
from app.db.session import AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession

def get_config() -> Settings:
    return get_settings()


ConfigDep = Annotated[Settings, Depends(get_config)]

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session