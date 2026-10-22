from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from zipfile import ZipFile

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import pytest

from app.api.routes.repositories import router
from app.core.indexer.pipeline import IndexingPipeline
from app.db.dependencies import get_db
from app.services import repository_service as service_module


@pytest.fixture
def import_api(monkeypatch, tmp_path):
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    monkeypatch.setattr(service_module.file_storage, "create_workspace", lambda: workspace)

    def clone(url, destination):
        destination.mkdir()
        (destination / "example.py").write_text("def hello():\n    return 'hello'\n")

    clone_repository = Mock(side_effect=clone)
    monkeypatch.setattr(service_module.GithubRepository, "clone", clone_repository)
    index = Mock(return_value={
        "stats": {"nodes": 1, "edges": 0},
        "units": [SimpleNamespace(filepath="example.py")],
    })
    monkeypatch.setattr(service_module.index_service, "index_repository", index)
    create = AsyncMock(return_value=SimpleNamespace(id="github-repo"))
    complete = AsyncMock()
    monkeypatch.setattr(service_module.repository_crud, "create", create)
    monkeypatch.setattr(service_module.repository_crud, "complete_indexing", complete)

    db = AsyncMock()

    async def database():
        yield db

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = database

    with TestClient(app) as client:
        yield SimpleNamespace(
            client=client, workspace=workspace, clone=clone_repository,
            index=index, create=create, complete=complete, db=db,
        )


def test_github_import_indexes_and_saves_the_repository(import_api):
    response = import_api.client.post(
        "/repositories/github",
        data={"github_url": "https://github.com/owner/repo.git/"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "repository_id": "github-repo", "status": "READY", "nodes": 1, "edges": 0,
    }
    import_api.clone.assert_called_once_with(
        "https://github.com/owner/repo", import_api.workspace / "repo",
    )
    import_api.index.assert_called_once_with(str(import_api.workspace / "repo"))
    assert import_api.create.call_args.kwargs["source_type"] == "github"
    assert import_api.create.call_args.kwargs["github_url"] == "https://github.com/owner/repo"
    import_api.complete.assert_awaited_once()
    assert import_api.workspace.exists()


def test_invalid_github_url_does_not_clone_or_index(import_api):
    response = import_api.client.post(
        "/repositories/github", data={"github_url": "/home/user/repo"},
    )

    assert response.status_code == 400
    import_api.clone.assert_not_called()
    import_api.index.assert_not_called()
    import_api.create.assert_not_awaited()


def test_github_url_is_required(import_api):
    assert import_api.client.post("/repositories/github").status_code == 422
    import_api.clone.assert_not_called()


@pytest.mark.parametrize("status", [404, 502, 503, 504])
def test_failed_clone_cleans_up_without_indexing(import_api, status):
    import_api.clone.side_effect = HTTPException(status, "Clone failed")

    response = import_api.client.post(
        "/repositories/github", data={"github_url": "https://github.com/owner/repo"},
    )

    assert response.status_code == status
    assert not import_api.workspace.exists()
    import_api.index.assert_not_called()
    import_api.create.assert_not_awaited()
    import_api.db.rollback.assert_awaited_once()


@pytest.mark.parametrize(("error", "status"), [
    (ValueError("No supported functions or classes were found."), 400),
    (RuntimeError("Vector store unavailable"), 500),
])
def test_failed_index_cleans_up_without_reporting_ready(import_api, error, status):
    import_api.index.side_effect = error

    response = import_api.client.post(
        "/repositories/github", data={"github_url": "https://github.com/owner/repo"},
    )

    assert response.status_code == status
    assert not import_api.workspace.exists()
    import_api.create.assert_not_awaited()
    import_api.db.rollback.assert_awaited_once()


def test_zip_upload_still_uses_the_same_indexing_flow(import_api):
    archive = BytesIO()
    with ZipFile(archive, "w") as zip_file:
        zip_file.writestr("repo/example.py", "def hello():\n    return 'hello'\n")

    response = import_api.client.post(
        "/repositories/upload",
        files={"file": ("repo.zip", archive.getvalue(), "application/zip")},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "READY"
    import_api.clone.assert_not_called()
    import_api.index.assert_called_once_with(str(import_api.workspace / "repo"))
    assert import_api.create.call_args.kwargs["source_type"] == "zip"


def test_empty_repository_does_not_erase_the_current_vector_index(tmp_path):
    pipeline = IndexingPipeline.__new__(IndexingPipeline)
    pipeline.vector_store = Mock()

    with pytest.raises(ValueError, match="No supported functions or classes"):
        pipeline.index_repository(str(tmp_path))

    pipeline.vector_store.recreate_collection.assert_not_called()
