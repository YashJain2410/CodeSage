from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
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


@router.post("/github")
async def import_github_repository(
    github_url: str = Form(...),
    db: AsyncSession = Depends(get_db),
):

    try:
        return await repository_service.import_github(
            db=db,
            github_url=github_url,
        )

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error


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
