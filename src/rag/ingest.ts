import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Document } from "@langchain/core/documents";
import { formatError, getKnowledgeDir } from "../config.js";
import { chunkText } from "./chunk.js";

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".markdown"]);

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

export async function loadKnowledgeDocuments(
  knowledgeDir = getKnowledgeDir(),
): Promise<Document[]> {
  const root = path.resolve(knowledgeDir);
  try {
    const info = await stat(root);
    if (!info.isDirectory()) {
      throw new Error(`Knowledge path is not a directory: ${root}`);
    }
  } catch (error: unknown) {
    throw new Error(`Cannot read knowledge dir ${root}: ${formatError(error)}`);
  }

  const files = await listFiles(root);
  if (files.length === 0) {
    throw new Error(`No .md or .txt files found under ${root}`);
  }

  const documents: Document[] = [];
  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const source = path.relative(process.cwd(), file).replaceAll("\\", "/");
    documents.push(...chunkText(raw, source));
  }
  return documents;
}
