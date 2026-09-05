import { Document } from "@langchain/core/documents";
import { CHUNK_OVERLAP, CHUNK_SIZE } from "../config.js";

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function chunkText(
  text: string,
  source: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): Document[] {
  const paragraphs = splitParagraphs(text);
  const chunks: Document[] = [];
  let buffer = "";
  let index = 0;

  const flush = (): void => {
    const content = buffer.trim();
    if (content.length === 0) {
      return;
    }
    chunks.push(
      new Document({
        pageContent: content,
        metadata: {
          source,
          chunkId: `${source}#${index}`,
        },
      }),
    );
    index += 1;
    if (overlap > 0 && content.length > overlap) {
      buffer = content.slice(-overlap);
    } else {
      buffer = "";
    }
  };

  for (const paragraph of paragraphs) {
    if (buffer.length + paragraph.length + 2 > chunkSize && buffer.length > 0) {
      flush();
    }
    buffer = buffer.length === 0 ? paragraph : `${buffer}\n\n${paragraph}`;
    while (buffer.length > chunkSize) {
      flush();
    }
  }
  flush();
  return chunks;
}
