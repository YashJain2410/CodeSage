from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str
    repository_id: str
    model_provider: str | None = Field(default=None, min_length=1)
    model_name: str | None = Field(default=None, min_length=1)


class QueryResponse(BaseModel):
    answer: str
    intent: str
    confidence: float
    citations: list[str]
    model_provider: str
    model_name: str
