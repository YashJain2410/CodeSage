from pydantic import BaseModel

class IndexRepositoryRequest(BaseModel):

    repo_path: str