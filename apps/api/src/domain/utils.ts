import type { RetrievedChunk } from "./rag/types.js";

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
