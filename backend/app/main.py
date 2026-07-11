from fastapi import FastAPI, Request
import time
import uuid
import structlog
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

from app.observability.structured_log import setup_logging
from app.observability.metrics import REQUEST_COUNT, REQUEST_LATENCY
from app.dependencies import ConfigDep
from app.api.routes.query import router as query_router
from app.api.routes.metrics import router as metrics_router
from contextlib import asynccontextmanager
from app.core.runtime.startup import initialize_application
from app.config import get_settings
from app.api.routes.graph import router as graph_router
from app.api.routes.index import router as index_router
from fastapi.middleware.cors import CORSMiddleware
# from app.api.middleware.logging import LoggingMiddleware
# from app.api.middleware.auth import AuthenticationMiddleware

settings = get_settings()

setup_logging()

log = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):

    # initialize_application(
    #     repo_path="/Users/yashjain/Data/CodeSage/backend/tests/fixtures/sample_repo"
    # )

    initialize_application(
        repo_path=settings.repo_path
    )

    yield


app = FastAPI(
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.add_middleware(LoggingMiddleware)
# app.add_middleware(AuthenticationMiddleware)
# app.add_middleware(LoggingMiddleware)

app.include_router(query_router)
app.include_router(metrics_router)
app.include_router(graph_router)
app.include_router(index_router)

@app.get("/")
def root(config: ConfigDep):
    return {"message": "CodeSage running"}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)