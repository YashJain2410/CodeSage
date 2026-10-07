# CodeSage frontend

The current CodeSage workspace: repository inputs, chat with source inspection, interactive code graphs, evaluation views, and telemetry. Built with Next.js App Router, React, and TypeScript.

[Project overview](../README.md) · [Backend setup](../docs/GETTING-STARTED.md) · [API contract](API-CONTRACT.md) · [Verification](QA.md)

## Run locally

Requires Node.js 20.9+; developed with Node.js 22.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). Select **Explore the demo** for an independent product tour. Demo answers, scores, and telemetry are prepared examples based on the backend's sample repository. Live mode uses backend capabilities discovered from `/openapi.json`.

## Screens

| Route | Purpose |
| --- | --- |
| `/` | Product introduction and demo entry. |
| `/workspace` | Repository overview and starter questions. |
| `/repositories` | Source inputs and availability checks. |
| `/chat` | Answers, source citations, saved conversations, and Markdown export. |
| `/graph` | Layouts, search, module filters, symbol details, and PNG/JSON export. |
| `/eval` | Scores, run comparison, case details, and JSON export. |
| `/observability` | Prometheus summaries and available service signals. |
| `/settings` | Connection, provider/model selection, theme, and demo/live mode. |
| `/docs` | In-app user guide. |

Live evaluation, alternate ingestion, streaming, progress, and source retrieval require backend contracts described in [API-CONTRACT.md](API-CONTRACT.md). Missing capabilities display unavailable states.

## Connection and state

- `CODESAGE_BACKEND_URL` controls the same-origin `/api/backend` proxy. Default: `http://127.0.0.1:8000`. Set it **before production builds** and rebuild when it changes.
- `NEXT_PUBLIC_API_MODE=current` matches the checked-in backend. Use `planned` only after implementing the proposed API.
- `NEXT_PUBLIC_API_URL` enables direct browser requests instead; configure backend CORS accordingly. Never place provider secrets in public frontend variables.
- Conversations and repository entries live in browser storage. Queries are independent; the backend has no conversation-memory contract.
- Source mirrors are in memory and disappear on refresh. The current backend has one active graph; earlier repository entries need re-indexing after switching.

The proxy allows up to ten minutes and 102 MB of buffered request data. The UI upload limit is 100 MB. External reverse proxies need compatible limits. ZIP source previews apply separate filtering and size limits; these are not server-side upload protection.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run test:api` starts a labeled contract fixture on port 8000. Use it only while the real backend is stopped. It verifies UI transport, not indexing or LLM quality. See [QA.md](QA.md) for the recorded browser checks and limits.

## Package

```bash
npm run build
npm start
```

```bash
docker build --build-arg CODESAGE_BACKEND_URL=http://backend:8000 -t codesage-frontend-next .
docker run --rm -p 3000:3000 codesage-frontend-next
```

For live container use, join the frontend and backend to a network where `backend` resolves. The standalone image runs as an unprivileged user; Docker deployment has not been validated.

TanStack Query manages requests; Zustand stores workspace state; React Flow/dagre render graphs; Recharts displays metrics. Fonts are self-hosted, with licenses in `public/fonts/`. See [design notes](DESIGN.md) and [operations](../docs/OPERATIONS.md). Maintainer: [Yash Jain](https://github.com/YashJain2410).
