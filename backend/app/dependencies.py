from fastapi import Depends
from typing import Annotated

from app.config import get_settings, Settings

def get_config() -> Settings:
    return get_settings()


ConfigDep = Annotated[Settings, Depends(get_config)]