import { createEmbeddings } from "../bedrock.js";
import { RAG_TOP_K } from "../config.js";
import { formatError } from "../../shared/utils.js";
import type {
  KnowledgeStore,
  RetrievedChunk,
} from "../../domain/rag/types.js";
import { ensureSchema, getPool, toVectorLiteral } from "../db/client.js";

interface ChunkRow {
  source: string;
  chunk_id: string;
  content: string;
}

export class PgKnowledgeStore implements KnowledgeStore {
  async retrieve(query: string, k = RAG_TOP_K): Promise<RetrievedChunk[]> {
    try {
      const vector = await createEmbeddings().embedQuery(query);
      const result = await getPool().query<ChunkRow>(
        `SELECT source, chunk_id, content
         FROM chunks
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [toVectorLiteral(vector), k],
      );
      return result.rows
        .map((row) => ({
          id: row.chunk_id,
          source: row.source,
          content: row.content.trim(),
        }))
        .filter((chunk) => chunk.content.length > 0);
    } catch (error: unknown) {
      throw new Error(`pgvector search failed: ${formatError(error)}`);
    }
  }
}

export async function upsertChunks(
  chunks: Array<{
    source: string;
    chunkId: string;
    content: string;
    embedding: number[];
  }>,
): Promise<number> {
  const pool = getPool();
  await ensureSchema();
  await pool.query("DELETE FROM chunks");
  for (const chunk of chunks) {
    await pool.query(
      `INSERT INTO chunks (source, chunk_id, content, embedding)
       VALUES ($1, $2, $3, $4::vector)`,
      [
        chunk.source,
        chunk.chunkId,
        chunk.content,
        toVectorLiteral(chunk.embedding),
      ],
    );
  }
  return chunks.length;
}

export async function createPgStore(): Promise<PgKnowledgeStore> {
  await ensureSchema();
  return new PgKnowledgeStore();
}
