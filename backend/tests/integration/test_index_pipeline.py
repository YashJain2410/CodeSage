from pathlib import Path
import pytest

from app.config import get_settings
from app.core.indexer.pipeline import IndexingPipeline
from app.core.indexer.qdrant_store import QdrantCodeStore


@pytest.mark.model
def test_pipeline_indexing(tmp_path: Path):

    # create fake repo
    repo = tmp_path / "repo"

    repo.mkdir()

    # create python file
    auth_file = repo / "auth.py"

    auth_file.write_text(
        """
def login(username, password):
    return True

def logout():
    return True
"""
    )

    # create test file
    test_file = repo / "test_auth.py"

    test_file.write_text(
        """
from auth import login

def test_login():
    assert login("yash", "123")
"""
    )

    # create pipeline
    settings = get_settings().model_copy(update={
        "embed_provider": "unixcoder", "embed_model": "microsoft/unixcoder-base",
        "embed_dimensions": None,
    })
    pipeline = IndexingPipeline(settings=settings)

    # use in-memory qdrant
    pipeline.vector_store = QdrantCodeStore(
        url=":memory:", settings=settings
    )

    runtime = pipeline.index_repository(
        str(repo)
    )

    stats = runtime["stats"]

    print("\nPIPELINE STATS:")
    print(stats)

    assert stats["units"] > 0
    assert stats["nodes"] > 0
    assert stats["edges"] > 0
