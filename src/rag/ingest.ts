import { Document } from "@langchain/core/documents";
import { formatError, getKnowledgeDir } from "../config.js";
import { listKnowledgeFiles, readDocument } from "../knowledge/files.js";
import { chunkText } from "./chunk.js";

export async function loadKnowledgeDocuments(): Promise<Document[]> {
  try {
    const files = await listKnowledgeFiles();
    if (files.length === 0) {
      throw new Error("No .md or .txt files found under knowledge/");
    }
    const documents: Document[] = [];
    const root = getKnowledgeDir().replaceAll("\\", "/");
    for (const relative of files) {
      const raw = await readDocument(relative);
      const source = `${root}/${relative}`.replaceAll("//", "/");
      documents.push(...chunkText(raw, source));
    }
    return documents;
  } catch (error: unknown) {
    throw new Error(`Failed to load knowledge files: ${formatError(error)}`);
  }
}
