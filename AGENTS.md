# AI_Advanced

npm workspaces: `apps/api` (Express + LangGraph), `apps/web` (Vite React), `infra` (CDK S3+IAM). Corpus lives in `knowledge/`; golden cases in `evals/golden.json`. `.env` is at the repo root.

## Commands

- `npm run setup` — install workspaces and typecheck the API
- `npm run db:up` — Docker pgvector
- `npm run api` / `npm run ui` — API on 8787, UI on 5173
- `npm run ingest` / `npm start` — load chunks / CLI query
- `npm test` / `npm run eval:offline` — unit tests and golden routing
- `npm run cdk:synth` — synth only; do not `cdk deploy` unless asked

## Layout rules

Details and examples are in `.cursor/rules/` (`conventions`, `api-layers`, `api`, `web`, `infra`). Short version: do not name a file after one function. A helper used by every layer in `apps/api` goes in `apps/api/src/shared/`. Otherwise use `types.ts`, `constants.ts`, `schemas.ts`, `utils.ts`, or `middleware.ts` in the owning folder (no prefixes like `http.constants.ts`).

Web DTOs stay in `apps/web/src/shared`; there is no `packages/shared` package.

MCP entry: `apps/api/src/interfaces/mcp/server.ts`.
