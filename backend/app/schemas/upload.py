from pydantic import BaseModel


class UploadResponse(BaseModel):
    repository_id: str
    repository_name: str
    status: str
    workspace_path: str