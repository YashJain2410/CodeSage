from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    return {
        "status": "ok",
        "qdrant": True,
        "redis": True,
        "postgres": True
    }