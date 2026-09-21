# AI_Advanced

Personal knowledge agent: file RAG, LangGraph, MCP, harness, Docker **pgvector**, local React UI, optional S3 via CDK.

Layout: `apps/api` (Express), `apps/web` (Vite), `infra` (CDK S3+IAM), `knowledge/` and `evals/` at the repo root.

Chat: Claude Haiku 4.5. Embeddings: Titan Text Embeddings V2 (`1024` dims). Region: `us-east-1`. Profile: `ai-advanced`.

## Daily flow (local)

1. Docker Desktop running (engine must be up; `db:up` fails if the Docker pipe is missing)
2. `npm run setup`
3. `npm run db:up`
4. After Bedrock verification: `npm run smoke` then `npm run ingest`
5. `npm run api` and in another terminal `npm run ui`
6. Open http://localhost:5173

CLI still works: `npm start`

## Backend layout

Express HTTP API under `apps/api/src/`:

- `shared/` — helpers used across layers (`formatError`, `REPO_ROOT`)
- `domain/` — types, chunking, citations, keyword ranking (no I/O)
- `application/` — agent graph, harness, ingest and query use cases
- `infrastructure/` — Bedrock, Postgres, local files, S3
- `interfaces/` — Express, CLI, MCP, evals, smoke
- `server.ts` / `index.ts` — HTTP listen and CLI composition roots

Do not name a file after a single function. Cross-layer helpers go in `shared/`; otherwise use `types.ts`, `constants.ts`, `schemas.ts`, `utils.ts`, or `middleware.ts` in the owning folder.

## Without Bedrock

- `npm test`
- `npm run eval:offline`
- `npm run mcp`
- `npm run cdk:synth` (does **not** deploy)

## S3 originals

CDK stack is S3 + IAM for `BarUser` only. No RDS/Lambda.

```powershell
npm run cdk:synth
```

Deploy only when you ask. Then set `KNOWLEDGE_BUCKET=knowledge-ACCOUNT-us-east-1` and upload keys under `knowledge/`.

## Env

See `.env.example`. `DATABASE_URL` points at Docker Postgres. `.env` and `knowledge/` resolve from the repo root even when scripts run in `apps/api`.
