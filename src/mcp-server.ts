import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { formatError } from "./config.js";
import { readDocument, searchKnowledge } from "./knowledge/files.js";
import { ReadDocumentArgs, SearchKnowledgeArgs } from "./tools/knowledge.js";

const GetSystemMetricsInput = z.object({
  host: z
    .string()
    .min(1)
    .optional()
    .describe("Hostname to query. Defaults to localhost."),
});

interface SystemMetrics {
  host: string;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  uptimeSeconds: number;
  requestLatencyMs: number;
  timestamp: string;
}

function dummyMetrics(host: string): SystemMetrics {
  return {
    host,
    cpuPercent: 18.4,
    memoryPercent: 61.2,
    diskPercent: 43.7,
    uptimeSeconds: 172_800,
    requestLatencyMs: 14,
    timestamp: new Date().toISOString(),
  };
}

function textResult(text: string, isError = false) {
  return {
    isError,
    content: [{ type: "text" as const, text }],
  };
}

function createKnowledgeServer(): McpServer {
  const server = new McpServer({
    name: "knowledge-agent",
    version: "1.0.0",
  });

  server.registerTool(
    "get_system_metrics",
    {
      description:
        "Return dummy CPU, memory, disk, uptime, and latency metrics for a host.",
      inputSchema: GetSystemMetricsInput,
    },
    async ({ host }) => {
      try {
        return textResult(JSON.stringify(dummyMetrics(host ?? "localhost"), null, 2));
      } catch (error: unknown) {
        return textResult(
          `get_system_metrics failed: ${formatError(error)}`,
          true,
        );
      }
    },
  );

  server.registerTool(
    "read_document",
    {
      description:
        "Read a markdown/text file from the local knowledge directory. Path is relative, e.g. rag.md.",
      inputSchema: ReadDocumentArgs,
    },
    async ({ path }) => {
      try {
        return textResult(await readDocument(path));
      } catch (error: unknown) {
        return textResult(`read_document failed: ${formatError(error)}`, true);
      }
    },
  );

  server.registerTool(
    "search_knowledge",
    {
      description:
        "Deterministic keyword search over local knowledge files (no embeddings).",
      inputSchema: SearchKnowledgeArgs,
    },
    async ({ query }) => {
      try {
        const hits = await searchKnowledge(query);
        return textResult(
          hits.length === 0
            ? "No knowledge files matched."
            : JSON.stringify(hits, null, 2),
        );
      } catch (error: unknown) {
        return textResult(
          `search_knowledge failed: ${formatError(error)}`,
          true,
        );
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = createKnowledgeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("knowledge-agent MCP server running on stdio");
}

main().catch((error: unknown) => {
  console.error(`MCP server failed: ${formatError(error)}`);
  process.exit(1);
});
