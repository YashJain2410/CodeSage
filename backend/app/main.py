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

app.include_router(query_router)
app.include_router(metrics_router)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())

    structlog.contextvars.bind_contextvars(request_id = request_id)

    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time

    log.info(
        "request",
        method = request.method,
        path = request.url.path,
        status_code = response.status_code,
        duration = round(duration, 4),
    )

    REQUEST_COUNT.labels(
        method = request.method, 
        endpoint = request.url.path,
        status = response.status_code,
    ).inc()

    REQUEST_LATENCY.observe(duration)

    return response

@app.get("/")
def root(config: ConfigDep):
    return {"message": "CodeSage running"}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)