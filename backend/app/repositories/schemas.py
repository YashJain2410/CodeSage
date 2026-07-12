from enum import Enum

from pydantic import BaseModel, HttpUrl


class UploadType(str, Enum):

    ZIP = "zip"
    GITHUB = "github"
    FILE = "file"
    TEXT = "text"


class GithubRepositoryRequest(BaseModel):

    github_url: HttpUrl


class TextRepositoryRequest(BaseModel):

    filename: str
    content: str