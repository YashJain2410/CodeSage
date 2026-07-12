from pathlib import Path

import subprocess


class GithubRepository:

    def clone(
        self,
        url: str,
        destination: Path,
    ):

        subprocess.run(

            [

                "git",

                "clone",

                "--depth",

                "1",

                url,

                str(destination),

            ],

            check=True,

        )