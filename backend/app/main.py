from fastapi import FastAPI, Request
import time
from uuid import uuid4
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
from app.api.routes.repositories import router as repositories_router
from pathlib import Path

setup_logging()

log = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    Path(settings.repo_path).mkdir(
        parents=True,
        exist_ok=True,
    )

    initialize_application()

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

app.include_router(query_router)
app.include_router(metrics_router)
app.include_router(graph_router)
app.include_router(index_router)
app.include_router(repositories_router)


@app.get("/")
def root(config: ConfigDep):
    return {"message": "CodeSage running"}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)