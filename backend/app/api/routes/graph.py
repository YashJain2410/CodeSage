from fastapi import APIRouter, HTTPException

from app.core.runtime.application_state import app_state
from app.core.graph.serializer import GraphSerializer

router = APIRouter(
    prefix="/graph",
    tags = ["Graph"],
)

@router.get("")
def get_graph():

    if app_state.graph is None:
        raise HTTPException(
            status_code=404,
            detail="Repository has not been indexed."
        )
    
    return GraphSerializer.to_dict(
        app_state.graph,
        app_state.repo_path,
    )
