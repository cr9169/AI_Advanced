import { STOPWORDS } from "../constants.js";
import type { KnowledgeHit, RankableDocument } from "./types.js";

export type { KnowledgeHit, RankableDocument };

export function rankDocuments(
  documents: RankableDocument[],
  query: string,
  limit = 8,
): KnowledgeHit[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    throw new Error("Search query must be non-empty.");
  }
  const terms = needle
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9_-]/g, ""))
    .filter((term) => term.length > 2 && !STOPWORDS.has(term));
  const ranked: Array<KnowledgeHit & { score: number }> = [];

  for (const document of documents) {
    const lower = document.content.toLowerCase();
    let score = 0;
    if (lower.includes(needle)) {
      score += 10;
    }
    for (const term of terms) {
      if (lower.includes(term)) {
        score += 1;
      }
    }
    if (score === 0) {
      continue;
    }
    const probe = terms[0] ?? needle;
    const idx = lower.indexOf(probe);
    const start = Math.max(0, idx === -1 ? 0 : idx - 80);
    ranked.push({
      path: document.path,
      snippet: document.content.slice(start, start + 240).trim(),
      score,
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit).map(({ path, snippet }) => ({ path, snippet }));
}
