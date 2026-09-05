# AI_Advanced

Local TypeScript lab for **file RAG**, LangGraph, MCP, and evals on **AWS Bedrock**.

Chat: Claude Haiku 4.5 (cheap default). Embeddings: Titan Text Embeddings V2. Region: `us-east-1`. Profile: `ai-advanced`.

## Setup

1. Copy `.env.example` to `.env` (already uses `AWS_PROFILE=ai-advanced`).
2. AWS CLI profile `ai-advanced` must work: `aws sts get-caller-identity --profile ai-advanced`
3. Bedrock: Anthropic use-case form once; new accounts may wait on AWS verification before `InvokeModel`.
4. `npm run setup`

## Commands

- `npm run smoke` — Titan + Haiku ping (do this first after verification)
- `npm start` — index `knowledge/` and answer a technical question
- `npm run eval` — deterministic checks + LLM-as-judge
- `npm run mcp` — stdio MCP dummy metrics (Cursor)

Drop more `.md` files in `knowledge/` and re-run `npm start`.
