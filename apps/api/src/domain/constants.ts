export const ROUTES = ["technical", "operational"] as const;

export const STOPWORDS = new Set([
  "the",
  "and",
  "how",
  "does",
  "what",
  "which",
  "this",
  "from",
  "with",
  "for",
  "are",
  "not",
  "call",
  "use",
  "into",
  "that",
  "than",
]);

export const TEXT_EXTENSIONS = new Set([".md", ".txt", ".markdown"]);

export const DEFAULT_CHUNK_SIZE = 900;
export const DEFAULT_CHUNK_OVERLAP = 150;
