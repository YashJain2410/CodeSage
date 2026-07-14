from pydantic import BaseModel

class QueryRequest(BaseModel):
    query: str
    model_provider: str = "gemini"
    model_name: str = "gemini-3.5-flash"
    repository_id: str
    query: str


class QueryResponse(BaseModel):
    answer: str
    intent: str
    confidence: float
    citations: list[str]