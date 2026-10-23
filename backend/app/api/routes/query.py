from fastapi import APIRouter, HTTPException
from app.core.llm.errors import ModelConfigurationError, ModelRequestError

from app.schemas.query import (
    QueryRequest,
    QueryResponse,
)
from app.services.query_service import QueryService

router = APIRouter()

@router.post(
    "/query",
    response_model=QueryResponse,
)
def query(
    request: QueryRequest,
):
    
    service = QueryService(
        call_graph=...
    )

    try:
        result = service.answer(
            query=request.query,
            provider=request.model_provider,
            model=request.model_name,
        )
    except ModelConfigurationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return QueryResponse(
        answer = result["answer"],
        intent = result["intent"].value,
        confidence = result["confidence"],
        citations = result["citations"],
        model_provider=result["model_provider"],
        model_name=result["model_name"],
    )