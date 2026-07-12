from pathlib import Path

from fastapi import UploadFile

from app.repositories.manager import RepositoryManager


class RepositoryService:

    def __init__(self):

        self.manager = RepositoryManager()


    def upload_zip(
        self,
        file: UploadFile,
    ):

        return self.manager.upload_zip_file(file)


    def upload_file(
        self,
        file: UploadFile,
    ):

        return self.manager.upload_single_file(file)


    def upload_github(
        self,
        github_url: str,
    ):

        return self.manager.clone_github(github_url)


    def upload_text(
        self,
        filename: str,
        content: str,
    ):

        return self.manager.upload_text(
            filename,
            content,
        )