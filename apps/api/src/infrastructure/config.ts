import path from "node:path";
import { config as loadEnv } from "dotenv";
import { REPO_ROOT } from "../shared/constants.js";
import {
  DEFAULT_API_PORT,
  DEFAULT_AWS_REGION,
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBED_MODEL,
  DEFAULT_HARNESS_MAX_STEPS,
  DEFAULT_HARNESS_TIMEOUT_MS,
  DEFAULT_KNOWLEDGE_DIR,
  EMBED_DIMENSIONS,
  EVAL_TIMEOUT_MS,
  RAG_TOP_K,
} from "./constants.js";

loadEnv({ path: path.join(REPO_ROOT, ".env") });

if (process.env.AWS_PROFILE === undefined || process.env.AWS_PROFILE === "") {
  process.env.AWS_PROFILE = "ai-advanced";
}

export const CHAT_MODEL = process.env.CHAT_MODEL ?? DEFAULT_CHAT_MODEL;
export const EMBED_MODEL = process.env.EMBED_MODEL ?? DEFAULT_EMBED_MODEL;
export { EMBED_DIMENSIONS, EVAL_TIMEOUT_MS, RAG_TOP_K };

export const HARNESS_MAX_STEPS = Number.parseInt(
  process.env.HARNESS_MAX_STEPS ?? DEFAULT_HARNESS_MAX_STEPS,
  10,
);
export const HARNESS_TIMEOUT_MS = Number.parseInt(
  process.env.HARNESS_TIMEOUT_MS ?? DEFAULT_HARNESS_TIMEOUT_MS,
  10,
);
export const API_PORT = Number.parseInt(
  process.env.API_PORT ?? DEFAULT_API_PORT,
  10,
);

export function configureLangSmith(): void {
  const enabled = process.env.LANGCHAIN_TRACING_V2 === "true";
  const key = process.env.LANGCHAIN_API_KEY;
  if (enabled && key !== undefined && key !== "") {
    process.env.LANGCHAIN_TRACING_V2 = "true";
    process.env.LANGCHAIN_PROJECT =
      process.env.LANGCHAIN_PROJECT ?? "ai-advanced";
    return;
  }
  process.env.LANGCHAIN_TRACING_V2 = "false";
}

configureLangSmith();

export function getAwsRegion(): string {
  return (
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    process.env.BEDROCK_AWS_REGION ??
    DEFAULT_AWS_REGION
  );
}

export function getKnowledgeDir(): string {
  const dir = process.env.KNOWLEDGE_DIR ?? DEFAULT_KNOWLEDGE_DIR;
  return path.isAbsolute(dir) ? dir : path.join(REPO_ROOT, dir);
}

export function getKnowledgeBucket(): string | undefined {
  const bucket = process.env.KNOWLEDGE_BUCKET?.trim();
  return bucket === undefined || bucket === "" ? undefined : bucket;
}

export function getApiKey(): string | undefined {
  const key = process.env.API_KEY?.trim();
  return key === undefined || key === "" ? undefined : key;
}
