import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import type {
  KnowledgeStore,
  RetrievedChunk,
} from "../../domain/rag/types.js";
import { formatError } from "../../shared/utils.js";
import { createEmbeddings } from "../bedrock.js";
import { RAG_TOP_K } from "../config.js";
import { loadKnowledgeDocuments } from "../knowledge/documents.js";

export class MemoryKnowledgeStore implements KnowledgeStore {
  constructor(private readonly store: MemoryVectorStore) {}

  async retrieve(query: string, k = RAG_TOP_K): Promise<RetrievedChunk[]> {
    try {
      const hits = await this.store.similaritySearch(query, k);
      return hits
        .map((doc, index) => {
          const source =
            typeof doc.metadata.source === "string"
              ? doc.metadata.source
              : "unknown";
          const chunkId =
            typeof doc.metadata.chunkId === "string"
              ? doc.metadata.chunkId
              : `${source}#${index}`;
          return {
            id: chunkId,
            source,
            content: doc.pageContent.trim(),
          };
        })
        .filter((chunk) => chunk.content.length > 0);
    } catch (error: unknown) {
      throw new Error(`Vector similarity search failed: ${formatError(error)}`);
    }
  }
}

export async function createMemoryStoreFromFiles(): Promise<MemoryKnowledgeStore> {
  const documents = await loadKnowledgeDocuments();
  console.error(`Indexing ${documents.length} chunks into MemoryVectorStore`);
  const store = await MemoryVectorStore.fromDocuments(
    documents,
    createEmbeddings(),
  );
  return new MemoryKnowledgeStore(store);
}
