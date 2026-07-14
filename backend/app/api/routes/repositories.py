from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    HTTPException,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.dependencies import get_db
from app.services.repository_service import repository_service


router = APIRouter(
    prefix="/repositories",
    tags=["Repositories"],
)


@router.post("/upload")
async def upload_repository(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):

    try:

        if not file.filename.endswith(".zip"):
            raise HTTPException(
                status_code=400,
                detail="Only ZIP files are currently supported.",
            )

        return await repository_service.upload_zip(
            db=db,
            file=file,
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )