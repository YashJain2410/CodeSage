from fastapi import FastAPI
import structlog

from app.observability.structured_log import setup_logging
from app.observability.http import setup_request_metrics
from app.dependencies import ConfigDep
from app.api.routes.query import router as query_router
from app.api.routes.metrics import router as metrics_router
from contextlib import asynccontextmanager
from app.core.runtime.startup import initialize_application
from app.config import get_settings
from app.api.routes.graph import router as graph_router
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

setup_request_metrics(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://codesage.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query_router)
app.include_router(metrics_router)
app.include_router(graph_router)
app.include_router(repositories_router)


@app.get("/")
def root(config: ConfigDep):
    return {"message": "CodeSage running"}
