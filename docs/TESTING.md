# Testing and evaluation

Run checks for the layer you change. A frontend fixture verifies request/response handling; it does not verify the Python engine.

## Frontend checks

From `frontend-next/`, after `npm ci`:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Protocol tests cover split SSE frames and UTF-8, citation parsing, current/proposed graph formats, and Prometheus calculations. The [browser verification record](../frontend-next/QA.md) documents responsive layouts and demo interactions, with explicit limits.

For repeatable browser integration checks, `npm run test:api` starts the labeled API fixture on port 8000. Stop the real backend first, and stop the fixture before returning to live use.

## Backend checks

With the backend dependencies installed, a small service-independent check is:

```bash
cd backend
python -m pytest tests/unit/test/test_queries.py
```

The broader suite is available with `python -m pytest tests`. Some files are exploratory scripts; others use older function names or require model downloads, credentials, Qdrant, or Redis at import time. Do not describe this suite as a passing release gate without reviewing its actual result.

## Evaluation

The [golden set](../backend/app/evaluation/golden_set.json) contains questions with expected intent and symbols. The harness combines retrieval-oriented metrics with RAG answer scoring and MLflow reports.

| Metric | What it asks |
| --- | --- |
| Intent accuracy | Did the system classify the question correctly? |
| Topology recall | Did retrieval include the expected symbols? |
| Citation precision | Do citations point to expected evidence? |
| Faithfulness | Is the answer supported by retrieved context? |
| Context recall / precision | Is the needed context present and relevant? |
| Test mention rate | Were tests mentioned when expected? |

The regression comparison allows drops of 0.05 in faithfulness, context recall, and topology recall, and 0.03 in intent accuracy. These are absolute score differences, not proof of suitable production quality.

The harness expects `baseline.json`, which is not supplied; it imports Ragas, which is absent from the checked-in requirements. The evaluation route is also unmounted. See [API limitations](API.md#current-limitations) before attempting a live run. Demo scores are not benchmark evidence.

## CI status

The repository contains CI and quality-gate workflows, but their evaluation commands reference missing `app.evaluation.run_eval` and `scripts/evaluate.py` entry points. The deploy workflow only prints a placeholder. Until corrected and observed passing, local checks and their recorded scope are the available evidence.

## Documentation update checks

On 8 October 2026, frontend type checking, lint, and all nine protocol tests passed. The service-independent backend graph query check passed all three tests. Documentation links, code fences, and ignore rules were checked. This review did not rerun the full backend suite, production build, browser audit, or deployment.
