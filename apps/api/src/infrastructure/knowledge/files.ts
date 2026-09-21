import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { TEXT_EXTENSIONS } from "../../domain/constants.js";
import { formatError } from "../../shared/utils.js";
import { getKnowledgeDir } from "../config.js";

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
