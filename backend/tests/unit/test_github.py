import subprocess
from unittest.mock import patch

from fastapi import HTTPException
import pytest

from app.repositories.github import GithubRepository


@pytest.mark.parametrize("url", [
    "https://github.com/owner/repo",
    "https://github.com/owner/repo/",
    "https://github.com/owner/repo.git",
    " https://GitHub.com/owner/repo.git/ ",
])
def test_repository_urls_are_normalized(url):
    assert GithubRepository().validate_url(url) == "https://github.com/owner/repo"


@pytest.mark.parametrize("url", [
    "/home/user/repo",
    "file:///home/user/repo",
    "http://github.com/owner/repo",
    "git@github.com:owner/repo.git",
    "https://github.com.evil.example/owner/repo",
    "https://user:token@github.com/owner/repo",
    "https://github.com:443/owner/repo",
    "https://github.com/owner/repo/tree/main",
    "https://github.com/owner/repo?redirect=localhost",
    "https://github.com/owner/repo#readme",
    "https://github.com/owner/..",
    "https://github.com/owner/.",
    "https://github.com/owner/repo;touch /tmp/example",
])
def test_invalid_urls_never_start_git(url, tmp_path):
    with patch("app.repositories.github.subprocess.run") as run:
        with pytest.raises(ValueError):
            GithubRepository().clone(url, tmp_path / "source")

    run.assert_not_called()


def test_clone_uses_a_shallow_noninteractive_https_checkout(tmp_path):
    destination = tmp_path / "source"

    with patch("app.repositories.github.subprocess.run") as run:
        GithubRepository().clone("https://github.com/owner/repo.git/", destination)

    args = run.call_args.args[0]
    options = run.call_args.kwargs
    assert args[-2:] == ["https://github.com/owner/repo.git", str(destination)]
    assert args[args.index("--depth") + 1] == "1"
    assert "credential.helper=" in args
    assert "http.followRedirects=false" in args
    assert options["timeout"] == 120
    assert options["check"] is True
    assert options["env"]["GIT_TERMINAL_PROMPT"] == "0"
    assert options["env"]["GIT_ASKPASS"] == ""


@pytest.mark.parametrize(("error", "status"), [
    (subprocess.TimeoutExpired("git", 120), 504),
    (FileNotFoundError("git"), 503),
    (subprocess.CalledProcessError(128, "git", stderr="Repository not found"), 404),
    (subprocess.CalledProcessError(128, "git", stderr="could not read Username"), 404),
    (subprocess.CalledProcessError(128, "git", stderr="Could not resolve host"), 502),
])
def test_clone_failures_return_clear_http_errors(error, status, tmp_path):
    with patch("app.repositories.github.subprocess.run", side_effect=error):
        with pytest.raises(HTTPException) as failure:
            GithubRepository().clone("https://github.com/owner/repo", tmp_path / "source")

    assert failure.value.status_code == status
