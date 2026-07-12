from pathlib import Path


class RepositoryValidator:

    ALLOWED_EXTENSIONS = {

        ".py",
        ".js",
        ".ts",
        ".tsx",

        ".java",
        ".go",
        ".rs",

        ".cpp",
        ".c",
        ".hpp",

        ".cs",

        ".kt",

        ".swift",

        ".rb",

        ".php",

        ".scala",

        ".txt",

        ".md",

        ".json",

        ".yaml",

        ".yml",

        ".toml",
    }


    MAX_FILE_SIZE = 100 * 1024 * 1024

    MAX_REPOSITORY_SIZE = 500 * 1024 * 1024


    def validate_extension(
        self,
        path: Path,
    ):

        if path.suffix.lower() not in self.ALLOWED_EXTENSIONS:

            raise ValueError(
                f"Unsupported file type: {path.suffix}"
            )


    def validate_size(
        self,
        size: int,
    ):

        if size > self.MAX_FILE_SIZE:

            raise ValueError(
                "Uploaded file is too large."
            )