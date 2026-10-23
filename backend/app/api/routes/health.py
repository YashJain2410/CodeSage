from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    """Process liveness only; do not claim untested dependencies are connected."""
    return {"status": "ok"}
