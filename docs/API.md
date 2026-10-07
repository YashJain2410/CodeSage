# API reference

Local base URL: `http://127.0.0.1:8000`. The frontend proxies requests through `/api/backend`. The running [OpenAPI schema](http://localhost:8000/openapi.json) and [interactive API docs](http://localhost:8000/docs) are the authority for registered routes.

## Current routes

| Method | Path | Input | Output / behavior |
| --- | --- | --- | --- |
| GET | `/` | None | Application message; not a dependency readiness check. |
| POST | `/repositories/upload` | Multipart ZIP in `file` | Repository ID, `READY` status, node/edge counts; indexes synchronously. |
| POST | `/query` | JSON below | Answer, intent, confidence, string citations. |
| GET | `/graph` | None | Graph nodes/edges; 404 when no graph is loaded. |
| GET | `/metrics` | None | Prometheus text. |
| GET | `/openapi.json` | None | API schema. |
| POST | `/index` | `{ "repo_path": "..." }` | Deprecated; currently fails due to startup signature mismatch. |

### Query request

```json
{
  "query": "How does authentication work?",
  "repository_id": "repository-id-from-upload",
  "model_provider": "gemini",
  "model_name": "provider-model-id"
}
```

Select a model ID supported by your provider account. `gemini` and `openai` are recognized by the current factory. The intent fallback still uses Gemini independently of the selected answer provider.

### Response shape

```json
{
  "answer": "Generated explanation",
  "intent": "EXPLAIN",
  "confidence": 1.0,
  "citations": []
}
```

This is a schema example. The current generation node sets those confidence and citation values directly. `repository_id` is required by validation but does not isolate query state.

### Graph shape

Nodes include `id`, `label`, `filepath`, `node_type`, `is_test`, `start_line`, and `end_line`. Edges include `source`, `target`, `edge_type`, and `resolved`. This represents statically inferred relationships, not runtime call frequency or coverage.

## Availability and errors

FastAPI returns 422 for invalid request bodies. ZIP upload rejects non-ZIP filenames with 400 and wraps other service failures as 500. There is no application authentication or per-user authorization in the mounted routes.

GitHub/file/text ingestion and evaluation/health routes exist in source but are not mounted. Query SSE, progress streaming, and server source-file retrieval are not registered. See the [frontend integration contract](../frontend-next/API-CONTRACT.md) for proposed interfaces; use `current` mode until they are implemented.

Route registration establishes an interface, not successful backend execution.

## Current limitations

Reviewed against source on **8 October 2026**:

- `/index` passes `repo_path` to a startup function that takes no arguments. ZIP upload uses a separate pipeline, whose full execution was not verified in this documentation review.
- Generation returns empty citations and fixed confidence. Query state is global; `repository_id` does not select an isolated graph.
- Evaluation, health, and alternate ingestion routers are unmounted. Live SSE, progress, and source-file routes are absent.
- Evaluation needs an unprovided `baseline.json` and Ragas dependency. Its unmounted route passes the uncompiled workflow builder.
- TypeScript/TSX files use the JavaScript parser. Several configuration settings are declared but are not wired into component defaults.

The independent frontend demo remains usable. See [testing](TESTING.md) for verification evidence and [operations](OPERATIONS.md) for deployment limits.
