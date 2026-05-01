from fastapi import FastAPI, Request
import time
import uuid
import structlog
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

from app.observability.structured_log import setup_logging
from app.observability.metrics import REQUEST_COUNT, REQUEST_LATENCY
from app.dependencies import ConfigDep

setup_logging()

log = structlog.get_logger()

app = FastAPI()

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