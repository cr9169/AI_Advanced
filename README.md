# AI_Advanced

Local TypeScript lab for **file RAG**, LangGraph, MCP, a small **agent harness**, offline evals, and optional AWS CDK (S3). Chat: Claude Haiku 4.5. Embeddings: Titan Text Embeddings V2. Region: `us-east-1`. Profile: `ai-advanced`.

## Setup

1. Copy `.env.example` to `.env`.
2. `aws sts get-caller-identity --profile ai-advanced`
3. Bedrock: Anthropic use-case form once. New accounts may block `InvokeModel` until AWS verification finishes.
4. `npm run setup`

LangSmith is optional: set `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY` when you have a key. Leave tracing false until `npm run smoke` works.

## Commands that work without Bedrock

- `npm test` — unit tests (chunking, router, citations, MCP-equivalent tools)
- `npm run eval:offline` — golden file search + router checks (no LLM)
- `npm run mcp` — stdio MCP: `read_document`, `search_knowledge`, `get_system_metrics`
- `npm run cdk:synth` — synthesize the S3 stack (**does not deploy**)

## Commands that need Bedrock

- `npm run smoke` — Titan + Haiku ping
- `npm start` — index `knowledge/`, harness-capped agent (retrieve → tools loop → generate)
- `npm run eval` — live graph + LLM-as-judge

## Infra

See [infra/README.md](infra/README.md). Do not `cdk deploy` until you want a real S3 bucket.

Drop more `.md` files in `knowledge/` and re-run tests / start.
