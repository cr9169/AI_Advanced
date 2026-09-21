import type { AgentResult } from "../domain/types.js";
import { createVectorStore } from "../infrastructure/rag/create-store.js";
import { buildAgent } from "./agent/graph.js";
import { runWithHarness } from "./harness.js";

export async function createQueryRunner(): Promise<
  (query: string) => Promise<AgentResult>
> {
  const store = await createVectorStore();
  const graph = buildAgent(store);
  return (query: string) => runWithHarness(graph, query);
}

export async function runQuery(query: string): Promise<AgentResult> {
  const run = await createQueryRunner();
  return run(query);
}
