import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { formatError, getKnowledgeDir } from "../config.js";

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".markdown"]);

export interface KnowledgeHit {
  path: string;
  snippet: string;
}

function toPosix(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

export function getKnowledgeRoot(): string {
  return path.resolve(getKnowledgeDir());
}

export function resolveSafeKnowledgePath(relativePath: string): string {
  const trimmed = relativePath.trim();
  if (trimmed === "") {
    throw new Error("Document path must be non-empty.");
  }
  const root = getKnowledgeRoot();
  const resolved = path.resolve(root, trimmed);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes knowledge directory: ${relativePath}`);
  }
  return resolved;
}

async function walkFiles(dir: string, root: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(full, root)));
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(toPosix(path.relative(root, full)));
    }
  }
  return files;
}

export async function listKnowledgeFiles(): Promise<string[]> {
  const root = getKnowledgeRoot();
  try {
    const info = await stat(root);
    if (!info.isDirectory()) {
      throw new Error(`Knowledge path is not a directory: ${root}`);
    }
  } catch (error: unknown) {
    throw new Error(`Cannot read knowledge dir ${root}: ${formatError(error)}`);
  }
  return walkFiles(root, root);
}

export async function readDocument(relativePath: string): Promise<string> {
  const full = resolveSafeKnowledgePath(relativePath);
  try {
    return await readFile(full, "utf8");
  } catch (error: unknown) {
    throw new Error(`Failed to read ${relativePath}: ${formatError(error)}`);
  }
}

const STOPWORDS = new Set([
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

export async function searchKnowledge(
  query: string,
  limit = 8,
): Promise<KnowledgeHit[]> {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    throw new Error("Search query must be non-empty.");
  }
  const terms = needle
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9_-]/g, ""))
    .filter((term) => term.length > 2 && !STOPWORDS.has(term));
  const files = await listKnowledgeFiles();
  const ranked: Array<KnowledgeHit & { score: number }> = [];

  for (const relative of files) {
    const content = await readDocument(relative);
    const lower = content.toLowerCase();
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
    const snippet = content.slice(start, start + 240).trim();
    ranked.push({ path: relative, snippet, score });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit).map(({ path: filePath, snippet }) => ({
    path: filePath,
    snippet,
  }));
}
