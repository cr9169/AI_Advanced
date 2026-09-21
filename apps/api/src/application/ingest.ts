import { formatError } from "../shared/utils.js";
import { createEmbeddings } from "../infrastructure/bedrock.js";
import { loadKnowledgeDocuments } from "../infrastructure/knowledge/documents.js";
import { upsertChunks } from "../infrastructure/rag/pg-store.js";

export async function ingestKnowledge(): Promise<{
  files: number;
  chunks: number;
}> {
  try {
    const documents = await loadKnowledgeDocuments();
    const embeddings = createEmbeddings();
    const rows: Array<{
      source: string;
      chunkId: string;
      content: string;
      embedding: number[];
    }> = [];

    for (const doc of documents) {
      const source =
        typeof doc.metadata.source === "string"
          ? doc.metadata.source
          : "unknown";
      const chunkId =
        typeof doc.metadata.chunkId === "string"
          ? doc.metadata.chunkId
          : `${source}#${rows.length}`;
      const embedding = await embeddings.embedQuery(doc.pageContent);
      rows.push({
        source,
        chunkId,
        content: doc.pageContent,
        embedding,
      });
    }

    const chunks = await upsertChunks(rows);
    return { files: new Set(rows.map((row) => row.source)).size, chunks };
  } catch (error: unknown) {
    throw new Error(`Ingest failed: ${formatError(error)}`);
  }
}
