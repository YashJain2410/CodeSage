from fastapi import (
    APIRouter,
    File,
    Form,
    UploadFile,
)

from app.repositories.service import RepositoryService

router = APIRouter(
    prefix="/repositories",
    tags=["Repositories"],
)

service = RepositoryService()


@router.post("/zip")
def upload_zip(
    file: UploadFile = File(...)
):
    return service.upload_zip(file)


@router.post("/file")
def upload_file(
    file: UploadFile = File(...)
):
    return service.upload_file(file)


@router.post("/github")
def upload_github(
    github_url: str = Form(...)
):
    return service.upload_github(github_url)


@router.post("/text")
def upload_text(
    filename: str = Form(...),
    content: str = Form(...),
):
    return service.upload_text(
        filename,
        content,
    )