from fastapi import APIRouter, HTTPException

from app.schemas.index import IndexRepositoryRequest
from app.core.runtime.startup import initialize_application


router = APIRouter(
    prefix="/index",
    tags=["Indexing"],
)


@router.post(
        "",
        deprecated=True,
)
def index_repository(
    request: IndexRepositoryRequest
):

    try:

        runtime = initialize_application(
            repo_path=request.repo_path
        )

        return {
            "status": "success",
            "repo_path": runtime.repo_path,
            "nodes": runtime.graph.number_of_nodes(),
            "edges": runtime.graph.number_of_edges(),
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )