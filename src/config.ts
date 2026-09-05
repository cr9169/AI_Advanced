import { config as loadEnv } from "dotenv";

loadEnv();

if (process.env.AWS_PROFILE === undefined || process.env.AWS_PROFILE === "") {
  process.env.AWS_PROFILE = "ai-advanced";
}

export const CHAT_MODEL =
  process.env.CHAT_MODEL ??
  "anthropic.claude-haiku-4-5-20251001-v1:0";
export const EMBED_MODEL =
  process.env.EMBED_MODEL ?? "amazon.titan-embed-text-v2:0";
export const RAG_TOP_K = 4;
export const CHUNK_SIZE = 900;
export const CHUNK_OVERLAP = 150;
export const EVAL_TIMEOUT_MS = 60_000;

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getAwsRegion(): string {
  const region =
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    process.env.BEDROCK_AWS_REGION ??
    "us-east-1";

  return region;
}

export function getKnowledgeDir(): string {
  return process.env.KNOWLEDGE_DIR ?? "knowledge";
}
