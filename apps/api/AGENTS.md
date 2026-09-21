# apps/api

Layers under `src/`: `shared` (cross-layer), `domain`, `application`, `infrastructure`, `interfaces`.

- Graph allowlist is `read_document` and `search_knowledge` only (`application/tools/constants.ts`). `get_system_metrics` is MCP-only.
- Harness lives in `application/harness.ts` (timeout, max steps, empty query).
- HTTP is Express: `interfaces/http/app.ts`, `routes.ts`, one `middleware.ts`.
- `REPO_ROOT` in `shared/constants.ts` points at the git root so `.env`, `knowledge/`, and `evals/` still resolve when cwd is `apps/api`.
