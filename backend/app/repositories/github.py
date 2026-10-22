from pathlib import Path
import os
import re
import subprocess

from fastapi import HTTPException


class GithubRepository:

    def validate_url(self, url: str) -> str:

        match = re.fullmatch(
            r"https://github\.com/([A-Za-z0-9-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?",
            url.strip(),
            re.IGNORECASE,
        )

        if not match or match[2] in {".", ".."}:
            raise ValueError(
                "Use a GitHub repository URL, such as https://github.com/owner/repo."
            )

        return f"https://github.com/{match[1]}/{match[2]}"

    def clone(
        self,
        url: str,
        destination: Path,
    ):

        url = self.validate_url(url)

        try:

            subprocess.run(
                [
                    "git",
                    "-c", "credential.helper=",
                    "-c", "http.followRedirects=false",
                    "clone",
                    "--depth", "1",
                    "--single-branch",
                    "--",
                    f"{url}.git",
                    str(destination),
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=120,
                env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": ""},
            )

        except subprocess.TimeoutExpired as error:
            raise HTTPException(
                status_code=504,
                detail="GitHub took too long to clone the repository. Please retry.",
            ) from error

        except FileNotFoundError as error:
            raise HTTPException(
                status_code=503,
                detail="Git must be installed on the backend to import GitHub repositories.",
            ) from error

        except subprocess.CalledProcessError as error:
            message = (error.stderr or "").lower()

            if "not found" in message or "could not read username" in message:
                raise HTTPException(
                    status_code=404,
                    detail="Repository not found or private. Import a public GitHub repository.",
                ) from error

            raise HTTPException(
                status_code=502,
                detail="Could not clone the repository from GitHub. Please retry.",
            ) from error
