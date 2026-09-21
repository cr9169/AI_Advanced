import { Document } from "@langchain/core/documents";
import { formatError } from "../../shared/utils.js";
import { chunkText } from "../../domain/rag/chunk.js";
import { getKnowledgeDir } from "../config.js";
import { listKnowledgeSources, readKnowledgeSource } from "./source.js";

export async function loadKnowledgeDocuments(): Promise<Document[]> {
  try {
    const files = await listKnowledgeSources();
    if (files.length === 0) {
      throw new Error("No .md or .txt files found to ingest.");
    }
    const documents: Document[] = [];
    const root = getKnowledgeDir().replaceAll("\\", "/");
    for (const relative of files) {
      const raw = await readKnowledgeSource(relative);
      const source = `${root}/${relative}`.replaceAll("//", "/");
      documents.push(...chunkText(raw, source));
    }
    return documents;
  } catch (error: unknown) {
    throw new Error(`Failed to load knowledge files: ${formatError(error)}`);
  }
}
