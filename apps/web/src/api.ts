import { API_URL } from "./shared/constants";
import type { IngestResult, QueryResult } from "./shared/types";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function queryAgent(query: string): Promise<{
  ok: boolean;
  status: number;
  data: QueryResult & { error?: string };
}> {
  const response = await fetch(`${API_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await readJson<QueryResult & { error?: string }>(response);
  return { ok: response.ok, status: response.status, data };
}

export async function ingestKnowledge(): Promise<{
  ok: boolean;
  status: number;
  data: IngestResult;
}> {
  const response = await fetch(`${API_URL}/api/ingest`, { method: "POST" });
  const data = await readJson<IngestResult>(response);
  return { ok: response.ok, status: response.status, data };
}
