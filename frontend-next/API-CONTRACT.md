# API integration contract

`src/lib/api.ts` is the single transport adapter. `/api/backend` is a same-origin rewrite, not a new backend. Runtime feature availability is read from `GET /openapi.json`. A missing capability is never silently replaced with demo data.

## Current registered routes

Verified by reading `backend/app/main.py`, its mounted route modules, schemas, services, and graph serializer.

| Method | Route | Frontend request | Response |
| --- | --- | --- | --- |
| POST | `/repositories/upload` | multipart `file` containing ZIP | `{ repository_id, status: "READY", nodes, edges }` |
| POST | `/index` | `{ repo_path: string }` | `{ status: "success", repo_path, nodes, edges }` |
| POST | `/query` | `{ query, repository_id, model_provider, model_name }` | `{ answer, intent, confidence, citations: string[] }` |
| GET | `/graph` | none | `{ nodes, edges }` |
| GET | `/metrics` | none | Prometheus exposition text |
| GET | `/openapi.json` | none | FastAPI OpenAPI document |

Current graph nodes contain `id`, `label`, `filepath`, `node_type`, `is_test`, `start_line`, and `end_line`. Edges contain `source`, `target`, `edge_type`, and `resolved`. The adapter preserves test/external indicators and calculates incoming edge counts when absent.

`POST /index` does not return a repository ID. The client uses `local-runtime` as its explicit handle for the global runtime. The current query service ignores `repository_id` when choosing its graph; therefore only the most recently indexed live repository can be active. Earlier entries are marked for re-indexing. There is no server repository-list endpoint, so the list is labeled “Indexed in this browser”.

The checked-in query route passes `call_graph=...`; `QueryService` obtains query context from application state. This frontend sends the validated request contract but does not claim to validate that entire Python execution path without running the backend services.

## Routes present in source but not mounted

- `backend/app/repositories/router.py`: ZIP, GitHub, source file, pasted text.
- `backend/app/api/routes/eval.py`: evaluation execution.
- `backend/app/api/routes/health.py`: service health.
- No registered source-file retrieval route or indexing-progress stream was found.

Mount these routes and implement their service behavior to enable the associated live controls. Existing ZIP upload remains available through `/repositories/upload`; using planned mode changes that to `/repositories/zip`.

## Planned mode

Set `NEXT_PUBLIC_API_MODE=planned` at build time after implementing the following contracts. Rebuild after changing this value. URLs and payloads are explicit here so completing the backend does not require rebuilding the UI components.

### Ingestion

- `POST /repositories/zip`: multipart `file`.
- `POST /repositories/github`: multipart `github_url`.
- `POST /repositories/file`: multipart `file`.
- `POST /repositories/text`: multipart `filename`, `content`.
- `POST /index`: `{ repo_url: string }` for a backend path; GitHub uses its dedicated import route.

All return:

```json
{ "repository_id": "repo-123", "status": "ready", "nodes": 120, "edges": 210 }
```

Background jobs instead return `{ "job_id": "job-123", "repository_id": "repo-123", "status": "queued" }`. If a repository ID is unknown until completion, the progress event must provide it. Jobs without a progress route cannot be tracked to completion.

`GET /index/progress/{job_id}` returns SSE data objects:

```json
{ "status": "indexing", "files_indexed": 23, "total_files": 40, "current_phase": "Embedding", "progress_percent": 57.5, "message": "Embedding source symbols" }
```

Terminal events use `status: "done"` with `repository_id`, `nodes`, and `edges`, or `status: "error"` with `message`. The frontend uses genuine reported progress; synchronous current indexing shows an indeterminate request state.

### Queries

`POST /query`: `{ text, repo_id, model_provider, model_name }`. Response may be JSON as above or `Content-Type: text/event-stream`:

```text
data: {"intent":"EXPLAIN","confidence":0.92}

data: {"token":"The login workflow"}

data: {"token":" starts in authenticate_user."}

data: {"citations":[{"filepath":"auth/service.py","line":25}]}

data: [DONE]

```

`text` is accepted as an alternative token field; `answer` is accepted as a complete answer field. Error events use `{ "type": "error", "message": "..." }`. The reader handles split UTF-8 and SSE frames, final unterminated frames, CRLF, cancellation, and `[DONE]`. Source citations should be repository-relative. No conversation-memory contract is invented.

### Repository graph and source

- `GET /graph/{repo_id}` returns `{ nodes, edges }`.
- Nodes may use either the current keys or `{ id, label, file, type, line, docstring, callers_count, test_coverage }`.
- Edges may include `call_frequency`; absent frequency defaults to 1.
- `GET /file?path=<encoded repository-relative path>&repository_id=<id>` returns plain UTF-8 text or `{ content: string }`.

The backend must scope and validate file paths before reading them. Uploaded source previews provide a local fallback; they are not a server filesystem reader.

### Evaluations

`POST /eval`: `{ golden_set_path: string }`. Supported responses:

1. Current aggregate metrics (`faithfulness`, `topology_recall`, `intent_accuracy`, `citation_precision`, optional additional metrics, `passed`). The frontend records a browser-local completed run.
2. `{ job_id: string }`. The frontend polls `GET /eval/status/{job_id}` every 2 seconds, for up to 10 minutes. A terminal response is `{ status: "done", result: <report> }`, or `{ status: "done" }` plus a registered `GET /eval` endpoint to fetch results. Errors use `{ status: "error", message }`.

`GET /eval` returns:

```json
{
  "runs": [{
    "id": "run-1",
    "timestamp": "2026-10-07T12:00:00Z",
    "metrics": { "faithfulness": 0.92, "topology_recall": 0.86, "intent_accuracy": 0.95, "citation_precision": 0.96 },
    "passed": true,
    "test_cases": [{ "id": "case-1", "query": "How does authentication work?", "intent": "EXPLAIN", "retrieval_pass": true, "answer_quality_pass": true, "latency_ms": 680, "answer": "...", "retrieved_chunks": ["..."] }]
  }],
  "latest": { "faithfulness": 0.92, "topology_recall": 0.86, "intent_accuracy": 0.95, "citation_precision": 0.96 },
  "thresholds": { "faithfulness": 0.8, "topology_recall": 0.7, "intent_accuracy": 0.85, "citation_precision": 0.85 }
}
```

Report your actual thresholds rather than adopting UI defaults implicitly. The backend's `passed` result remains separate from frontend threshold indicators. Missing case details display an aggregate-only state.

### Health and telemetry

`GET /health`: `{ status, qdrant: boolean, redis: boolean, postgres: boolean }`. Missing checks display “Not reported”. No service health is fabricated.

`GET /metrics`: Prometheus text. The frontend reads the names defined in the current `backend/app/observability/metrics.py`. Histograms produce means from `_sum / _count`; request p95 is a bucket interpolation estimate. Zero observations display no data. Grafana, LangSmith, and MLflow URLs are optional browser-local links set in Settings.

## Scope

The plan defines a local, personal application without authentication. This frontend does not create account, billing, or team endpoints. Provider credentials remain in the Python environment. Authentication, multi-user authorization, conversation memory, and server-side repository history require explicit future API contracts.
