import type { Citation } from "../types.js";
import type { RetrievedChunk } from "./store.js";

export function citationsFromChunks(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((chunk) => ({ id: chunk.id, source: chunk.source }));
}

export function referencedChunkIndexes(answer: string): number[] {
  const matches = answer.matchAll(/\[(\d+)\]/g);
  const indexes = new Set<number>();
  for (const match of matches) {
    const raw = match[1];
    if (raw === undefined) {
      continue;
    }
    indexes.add(Number.parseInt(raw, 10));
  }
  return [...indexes].sort((a, b) => a - b);
}

export function citationsAreGrounded(
  answer: string,
  chunks: RetrievedChunk[],
): boolean {
  const refs = referencedChunkIndexes(answer);
  return refs.every((ref) => ref >= 1 && ref <= chunks.length);
}
