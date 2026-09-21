import { rankDocuments, type KnowledgeHit } from "../../domain/knowledge/ranking.js";
import { getKnowledgeBucket } from "../config.js";
import {
  listKnowledgeFiles as listLocalFiles,
  readDocument as readLocalDocument,
} from "./files.js";
import { listS3Knowledge, readS3Document } from "./s3.js";

export type { KnowledgeHit };

export async function listKnowledgeSources(): Promise<string[]> {
  const bucket = getKnowledgeBucket();
  if (bucket !== undefined) {
    return listS3Knowledge(bucket);
  }
  return listLocalFiles();
}

export async function readKnowledgeSource(relativePath: string): Promise<string> {
  const bucket = getKnowledgeBucket();
  if (bucket !== undefined) {
    return readS3Document(bucket, relativePath);
  }
  return readLocalDocument(relativePath);
}

export async function searchKnowledgeSources(
  query: string,
  limit = 8,
): Promise<KnowledgeHit[]> {
  const files = await listKnowledgeSources();
  const documents: Array<{ path: string; content: string }> = [];
  for (const relative of files) {
    documents.push({
      path: relative,
      content: await readKnowledgeSource(relative),
    });
  }
  return rankDocuments(documents, query, limit);
}
