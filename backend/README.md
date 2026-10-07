# CodeSage backend

FastAPI services for source ingestion, code graphs, hybrid retrieval, and generated answers.

| Directory | Responsibility |
| --- | --- |
| `app/api/` | Registered HTTP handlers and request processing. |
| `app/core/` | Parsers, graph algorithms, embeddings, retrieval, and LangGraph stages. |
| `app/services/` | Indexing, queries, and repository orchestration. |
| `app/db/` | Repository metadata and Alembic migrations. |
| `app/evaluation/` | Golden questions, scoring, and regression comparison. |
| `app/observability/` | Metrics and logging. |
| `app/workers/` | Celery task modules; upload currently indexes synchronously. |
| `tests/` | Checks, exploratory scripts, and a sample repository. |

Follow [local setup](../docs/GETTING-STARTED.md); settings load `backend/.env`. Use Python 3.12 and `requirements.txt`. The minimal `pyproject.toml` does not declare the full runtime dependency set; `requirements1.txt` and `requirements2.txt` are earlier snapshots.

Read [architecture](../docs/ARCHITECTURE.md), [API](../docs/API.md), and [current integration gaps](../docs/API.md#current-limitations) before running the full pipeline. Maintainer: [Yash Jain](https://github.com/YashJain2410).
