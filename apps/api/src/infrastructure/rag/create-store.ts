import type { KnowledgeStore } from "../../domain/rag/types.js";
import { getDatabaseUrl } from "../db/client.js";
import { createMemoryStoreFromFiles } from "./memory-store.js";
import { createPgStore } from "./pg-store.js";

export async function createVectorStore(): Promise<KnowledgeStore> {
  if (getDatabaseUrl() !== undefined) {
    console.error("Using pgvector store (DATABASE_URL)");
    return createPgStore();
  }
  console.error("DATABASE_URL unset; using in-memory store");
  return createMemoryStoreFromFiles();
}
