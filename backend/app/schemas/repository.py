from pydantic import BaseModel


class RepositoryCreateRequest(BaseModel):

    name: str

    source_type: str

    github_url: str | None = None


class RepositoryResponse(BaseModel):

    id: str

    name: str

    status: str

    workspace_path: str