import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../bedrock.js";
import { formatError, RAG_TOP_K } from "../config.js";
import { loadKnowledgeDocuments } from "./ingest.js";

export interface RetrievedChunk {
  id: string;
  source: string;
  content: string;
}

export async function createVectorStore(): Promise<MemoryVectorStore> {
  try {
    const documents = await loadKnowledgeDocuments();
    console.error(`Indexing ${documents.length} chunks from knowledge/`);
    return await MemoryVectorStore.fromDocuments(
      documents,
      createEmbeddings(),
    );
  } catch (error: unknown) {
    throw new Error(`Failed to index knowledge files: ${formatError(error)}`);
  }
}

export async function retrieveChunks(
  store: MemoryVectorStore,
  query: string,
): Promise<RetrievedChunk[]> {
  try {
    const hits = await store.similaritySearch(query, RAG_TOP_K);
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

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No retrieved documents.";
  }
  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] id=${chunk.id} source=${chunk.source}\n${chunk.content}`,
    )
    .join("\n\n");
}
