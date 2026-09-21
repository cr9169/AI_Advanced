import {
  readKnowledgeSource,
  searchKnowledgeSources,
} from "../../infrastructure/knowledge/source.js";
import { GRAPH_TOOL_ALLOWLIST } from "./constants.js";
import { ReadDocumentArgs, SearchKnowledgeArgs } from "./schemas.js";
import type { GraphToolName } from "./types.js";

export { GRAPH_TOOL_ALLOWLIST } from "./constants.js";
export { ReadDocumentArgs, SearchKnowledgeArgs } from "./schemas.js";
export type { GraphToolName } from "./types.js";

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
    return readKnowledgeSource(parsed.path);
  }

  const parsed = SearchKnowledgeArgs.parse(args);
  const hits = await searchKnowledgeSources(parsed.query);
  if (hits.length === 0) {
    return "No knowledge files matched.";
  }
  return hits.map((hit) => `${hit.path}:\n${hit.snippet}`).join("\n\n");
}
