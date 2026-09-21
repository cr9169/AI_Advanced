import {
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { executeKnowledgeTool } from "../tools/knowledge.js";

export const knowledgeTools = [
  tool(
    async (input: { path: string }) =>
      executeKnowledgeTool("read_document", input),
    {
      name: "read_document",
      description:
        "Read a markdown file from the knowledge directory by relative path (e.g. rag.md).",
      schema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path relative to knowledge/, e.g. rag.md",
          },
        },
        required: ["path"],
      },
    },
  ),
  tool(
    async (input: { query: string }) =>
      executeKnowledgeTool("search_knowledge", input),
    {
      name: "search_knowledge",
      description:
        "Keyword search over local knowledge files. Does not use embeddings.",
      schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keywords to find in knowledge files",
          },
        },
        required: ["query"],
      },
    },
  ),
];

export async function applyToolCalls(message: AIMessage): Promise<{
  messages: ToolMessage[];
  toolTrace: string[];
}> {
  const calls = message.tool_calls ?? [];
  const messages: ToolMessage[] = [];
  const toolTrace: string[] = [];

  for (const call of calls) {
    const args = { ...(call.args as Record<string, unknown>) };
    const output = await executeKnowledgeTool(call.name, args);
    const toolCallId = call.id ?? call.name;
    messages.push(
      new ToolMessage({
        content: output,
        tool_call_id: toolCallId,
      }),
    );
    toolTrace.push(`${call.name} ${JSON.stringify(args)}`);
  }

  return { messages, toolTrace };
}
