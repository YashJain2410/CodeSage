# CodeSage — the new frontend

A complete, independent frontend in `frontend-next/`. The original `frontend/`, backend, and root configuration are untouched.

## Run

Requires Node.js 20.9 or newer. Developed and checked with Node.js 22.

```bash
cd frontend-next
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). Start the Python backend separately with its existing service configuration. No real backend service was running during frontend development.

The default frontend proxy forwards `/api/backend/*` to `http://127.0.0.1:8000`. Set `CODESAGE_BACKEND_URL` in `.env.local` for another backend. Restart development after changing it. For production, set this value **before building**, because Next.js stores the rewrite destination in its build output. Direct browser-to-API access can instead use `NEXT_PUBLIC_API_URL`, provided the backend permits the frontend origin through CORS.

The proxy allows up to ten minutes for synchronous indexing and buffers up to 102 MB when necessary, matching the UI's 100 MB upload limit plus multipart overhead. Configure any external reverse proxy with appropriate upload and timeout limits too.

Use **Explore the demo** on the landing page to review every screen without backend services. Demo mode is explicit and keeps its repositories, conversations, and evaluation history separate from live mode. Example source comes from `backend/tests/fixtures/sample_repo`; answers, evaluation scores, and telemetry are prepared examples, not measured production results.

## Included screens

| Route | Workflow |
| --- | --- |
| `/` | Original marketing site, code relationship illustration, interactive product preview, repository quick start |
| `/workspace` | Active repository overview, graph statistics, starter questions, recent conversations |
| `/repositories` | ZIP, backend folder, GitHub, single-file, and pasted-code ingestion; availability checks |
| `/chat` | JSON and streamed answers, intent and confidence, citations, highlighted source, stop/retry, saved conversations, Markdown export |
| `/graph` | Hierarchical and force layouts, search, module filters, test/external toggles, focused neighborhoods, symbol details, PNG and JSON export |
| `/eval` | Metric cards, run comparison, trend lines and thresholds, sortable/filterable case details, async job polling, JSON export |
| `/observability` | Prometheus counters and histogram summaries, service health, intent distribution, raw metrics export |
| `/settings` | Connection and capability status, provider/model selection, theme, demo/live mode, monitoring links |
| `/docs` | User guide and integration setup |

Mobile navigation, mobile chat/source tabs, reduced-motion support, page loading/error states, focus indicators, and keyboard shortcuts are implemented. Chat history is local to the browser, not synchronized to an account. Source mirrors are held only in memory and disappear on refresh. ZIP previews skip dependency/build directories, `.env` files, oversized files, and archives with more than 10 MB of selected source data.

## Backend compatibility

Keep `NEXT_PUBLIC_API_MODE=current` for the checked-in Python backend. This sends the actual request fields (`repo_path`, `query`, `repository_id`, `model_provider`, `model_name`) and uses `/repositories/upload` and `/graph`. The current graph is global; indexing another repository marks earlier browser entries as needing re-indexing.

The complete future interfaces are built, but an unfinished backend feature cannot be made operational by frontend code alone. Missing routes appear as unavailable or no-data states. See [API-CONTRACT.md](./API-CONTRACT.md) for the endpoint contracts and activation steps. Set `NEXT_PUBLIC_API_MODE=planned` only after adopting those contracts.

The current query API does **not** accept a conversation ID or message history. Saved live conversations organize independent queries; they do not invent server-side conversation memory. The UI also does not infer a runtime coverage percentage from a call graph.

## Stack and design

Next.js 16 App Router, React 19, TypeScript, TanStack Query, Zustand, React Flow, dagre, Recharts, Framer Motion, next-themes, and Lucide. The plan's Next.js 14 dependency was replaced with a patched release. Fonts are self-hosted Inter and JetBrains Mono; license files are in `public/fonts/`.

The visual direction combines Phantom's lavender and pill navigation, Linear's workspace hierarchy, Cursor's code-first storytelling, Vercel's technical clarity, and Anthropic's editorial warmth. Typography, spacing, and diagrams carry the identity. No copied brand imagery, invented customer logos, or unsubstantiated product statistics are included. See [DESIGN.md](./DESIGN.md).

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Protocol tests cover chunked SSE, UTF-8 reconstruction, citations, both graph contracts, and Prometheus summaries. See [QA.md](./QA.md) for browser verification and its limits.

An optional **test API fixture** is included for repeatable browser contract checks:

```bash
# Only when the real backend is stopped and port 8000 is free:
npm run test:api
```

It serves deliberately labeled test responses matching the current registered routes. Stop it before using your real backend. It does not test indexing engines, databases, vector retrieval, or LLM quality.

## Production

```bash
npm run build
npm start
```

For Docker:

```bash
docker build --build-arg CODESAGE_BACKEND_URL=http://backend:8000 -t codesage-frontend-next .
docker run --rm -p 3000:3000 codesage-frontend-next
```

Both containers must share a network where `backend` resolves. Deployment has not been performed. The standalone image runs as an unprivileged user. The app is a personal development workspace, as specified in the plan; account authentication and multi-user isolation belong to a future backend contract.

The production dependency audit returned zero vulnerabilities during verification. The development lint dependency tree still reports five high-severity entries rooted in a transitive `braces` advisory; these packages are excluded from the standalone production runtime. Recheck dependencies before deployment.
