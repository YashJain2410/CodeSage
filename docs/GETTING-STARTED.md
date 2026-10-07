# Getting started

## Frontend demo

From the repository root, with Node.js 20.9+ installed:

```bash
cd frontend-next
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000), then **Explore the demo**. Sample code comes from the [test fixture](../backend/tests/fixtures/sample_repo/); answers and telemetry are prepared examples.

## Local backend

Use Python 3.12, Docker Compose, and a Gemini API key. The backend downloads embedding and reranking models on first use. These steps configure development services; they do not resolve the [known integration gaps](API.md#current-limitations).

From the repository root:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cp .env.example backend/.env
```

Edit `backend/.env`: set `GEMINI_API_KEY`, keep the sample local database URL, and remove the empty `REPO_PATH=` line to use the settings default. Keep credentials out of Git. Backend settings read **`backend/.env`**, regardless of the current directory.

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis qdrant
cd backend
python -m alembic -c ../alembic.ini upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run migrations from `backend/` so Alembic finds the same `.env`. The API uses asyncpg; migrations convert the URL to the synchronous PostgreSQL driver.

In a second terminal, start the frontend as above and switch Settings to live mode. Use `NEXT_PUBLIC_API_MODE=current`. Inspect [localhost:8000/docs](http://localhost:8000/docs) for the running API schema.

## Configuration

| Setting | Purpose / current behavior |
| --- | --- |
| `GEMINI_API_KEY` | Required by backend settings and the intent-classifier fallback. |
| `OPENAI_API_KEY` | Optional; needed when selecting an OpenAI answer model. |
| `DATABASE_URL` | PostgreSQL connection; use the example development credentials locally. |
| `QDRANT_API_KEY` | Optional vector-store credential. |
| `QDRANT_URL` | Declared in settings; current store constructors default to localhost. Verify wiring before using a remote store. |
| `REDIS_URL` | Celery broker/result store; current upload indexing runs synchronously. |
| `EMBED_MODEL`, `EMBED_BATCH_SIZE` | Declared settings; current embedder defaults are used by the pipeline. |
| `REPO_PATH` | Startup directory; ZIP storage currently uses `backend/workspaces/` when run from `backend/`. |
| `CODESAGE_BACKEND_URL` | Next.js proxy destination; default `http://127.0.0.1:8000`. Rebuild production after changing it. |
| `NEXT_PUBLIC_API_MODE` | `current` for this backend; `planned` only after adopting the proposed contract. |

## Common problems

| Symptom | Check |
| --- | --- |
| Port 3000 is busy | Grafana uses 3000 in the local Compose file. Start only the three data services or change Grafana's host port. |
| Settings validation fails | Confirm `backend/.env` contains a key and database URL; remove blank optional path values. |
| Graph returns 404 | No graph is loaded in the current API process. Re-index after restart using the ZIP upload path; `/index` has a documented signature mismatch. |
| `/index` returns 500 | The deprecated route passes `repo_path` to a startup function that takes no arguments. See [API limitations](API.md#current-limitations). |
| Live controls are unavailable | They depend on mounted backend routes. Check `/openapi.json`; demo mode remains independently usable. |

Stop local data services from the repository root with `docker compose -f infra/docker-compose.yml stop`. See [operations](OPERATIONS.md) before rebuilding or deleting containers.
