from pathlib import Path
import tempfile

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
)

from app.core.storage.file_storage import file_storage

from app.services.index_service import index_service

router = APIRouter(
    prefix="/upload",
    tags=["Upload"],
)


@router.post("/zip")
async def upload_zip(
    file: UploadFile = File(...)
):

    if not file.filename.endswith(".zip"):

        raise HTTPException(
            status_code=400,
            detail="Only ZIP files are supported.",
        )

    workspace = file_storage.create_workspace()

    temp = Path(tempfile.mktemp(suffix=".zip"))

    with temp.open("wb") as f:

        f.write(await file.read())

    file_storage.save_zip(
        temp,
        workspace,
    )

    temp.unlink()

    runtime = index_service.index_repository(
        str(workspace)
    )

    return {
        "status": "indexed",
        "workspace": str(workspace),
        "nodes": runtime["stats"]["nodes"],
        "edges": runtime["stats"]["edges"],
    }