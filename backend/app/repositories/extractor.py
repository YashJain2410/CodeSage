import shutil
import zipfile

from pathlib import Path


class RepositoryExtractor:

    def extract_zip(
        self,
        zip_path: Path,
        destination: Path,
    ):

        with zipfile.ZipFile(zip_path) as archive:

            archive.extractall(destination)


    def copy_file(
        self,
        source: Path,
        destination: Path,
    ):

        shutil.copy2(
            source,
            destination,
        )
