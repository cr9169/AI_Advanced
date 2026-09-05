import { z } from "zod";
import { readDocument, searchKnowledge } from "../knowledge/files.js";

export const GRAPH_TOOL_ALLOWLIST = [
  "read_document",
  "search_knowledge",
] as const;

export type GraphToolName = (typeof GRAPH_TOOL_ALLOWLIST)[number];

export const ReadDocumentArgs = z.object({
  path: z
    .string()
    .min(1)
    .describe("Path relative to the knowledge directory, e.g. rag.md"),
});

export const SearchKnowledgeArgs = z.object({
  query: z.string().min(1).describe("Substring or keywords to find in knowledge files"),
});

export function isGraphToolName(name: string): name is GraphToolName {
  return (GRAPH_TOOL_ALLOWLIST as readonly string[]).includes(name);
}

export async function executeKnowledgeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (!isGraphToolName(name)) {
    throw new Error(`Disallowed tool: ${name}`);
  }

  if (name === "read_document") {
    const parsed = ReadDocumentArgs.parse(args);
    return readDocument(parsed.path);
  }

  const parsed = SearchKnowledgeArgs.parse(args);
  const hits = await searchKnowledge(parsed.query);
  if (hits.length === 0) {
    return "No knowledge files matched.";
  }
  return hits
    .map((hit) => `${hit.path}:\n${hit.snippet}`)
    .join("\n\n");
}
