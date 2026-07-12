from enum import Enum


class RepositorySource(str, Enum):
    LOCAL = "local"
    ZIP = "zip"
    FOLDER = "folder"
    GITHUB = "github"
    FILE = "file"
    TEXT = "text"


class RepositoryStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    EXTRACTING = "extracting"
    INDEXING = "indexing"
    READY = "ready"
    FAILED = "failed"