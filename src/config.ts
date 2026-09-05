import { config as loadEnv } from "dotenv";

loadEnv();

export const CHAT_MODEL = "anthropic.claude-3-5-sonnet-20240620-v1:0";
export const EMBED_MODEL = "amazon.titan-embed-text-v2:0";
export const RAG_TOP_K = 3;
export const EVAL_TIMEOUT_MS = 30_000;

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
    process.env.BEDROCK_AWS_REGION;

  if (!region || region.trim() === "") {
    throw new Error(
      "Missing AWS region. Set AWS_REGION (see .env.example).",
    );
  }

  return region;
}
