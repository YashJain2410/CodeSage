# Verification record

Checked on 7 October 2026. Changes are confined to `frontend-next/`; the pre-existing frontend, backend, and root configuration were not edited.

## Automated checks

- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings.
- `npm test`: all nine protocol tests passed. Covers SSE frame boundaries, split UTF-8, CRLF and final frames, citation extraction, both graph formats, and Prometheus calculations.
- `npm run build`: passed; landing page and all eight workspace routes generated successfully, with an additional not-found page.
- `npm audit --omit=dev`: zero production vulnerabilities. Development-only lint dependencies have five transitive high-severity advisory entries; see README.

## Browser checks

Used the Codex in-app browser against the running Next.js development server.

| Area | Verified behavior |
| --- | --- |
| Landing | Desktop layout, demo entry, 375 px mobile layout without horizontal overflow |
| Chat | Creating a fresh conversation, submitting questions, prepared streamed answers, intent/confidence, citation-to-source navigation |
| Source | Correct file and highlighted line; uploaded ZIP source available in memory; mobile source tab opens when selecting a citation |
| Graph | Focused neighborhood, symbol selection, callers/callees, docstring, unknown coverage shown without a fabricated score; PNG export downloaded successfully |
| Evaluation | Sample run added, four metrics, trend chart, case expansion with answer and retrieved code, case filtering |
| Current API | Multipart ZIP upload, `repo_path` indexing, query/provider/model payload, JSON answer and citations, current graph shape, actual Prometheus sample parsing |
| Availability | Unregistered live evaluation disabled; unreported service health and metrics display missing-data states |
| Workspace | Only the latest indexed current-mode repository remains ready; browser repository/chat history removal; demo/live history separation |
| Navigation | Command search opens and filters pages/conversations; dark theme toggles and can be restored |
| Responsive | 375 × 812 chat/source/evaluation and landing; 768 × 1024 overview; desktop 1280 × 720. Checked horizontal overflow at these sizes |

Current API checks used `tests/mock-api.mjs`, a deliberately labeled contract fixture reproducing the registered routes. The fixture was stopped after testing, and disposable live test history removed. The preview was restored to the explicitly labeled demo workspace. It is not a substitute for Python backend integration testing.

Screenshots: [landing](./docs/screenshots/landing.png), [workspace](./docs/screenshots/workspace.png).

## Verification limits

- No real Python backend, database, vector store, embedding engine, or LLM was running. Actual indexing/retrieval quality and backend execution remain unverified.
- Planned ingestion, query SSE, progress, file, evaluation, and health contracts need their backend implementations. Transport parsing is tested; those unimplemented live workflows cannot be verified end to end yet.
- Docker configuration is included but the image was not built or deployed.
- No formal screen-reader, cross-browser, load, or comprehensive accessibility audit was performed. Keyboard focus, semantic labels, reduced-motion behavior, and responsive layouts are implemented.
- The graph renders at most 350 filtered symbols at once; focus, module filters, zoom, and exports support larger repositories. Source mirrors and browser-local history are intentionally not an account synchronization system.
