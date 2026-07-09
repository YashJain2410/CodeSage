from fastapi import APIRouter

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

    result = service.answer(
        query = request.query,
        provider = request.model_provider,
        model = request.model_name,
    )

    return QueryResponse(
        answer = result["answer"],
        intent = result["intent"].value,
        confidence = result["confidence"],
        citations = result["citations"],
    )