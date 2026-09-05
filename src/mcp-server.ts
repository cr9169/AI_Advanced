import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { formatError } from "./config.js";

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

function createMetricsServer(): McpServer {
  const server = new McpServer({
    name: "system-metrics",
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
        const metrics = dummyMetrics(host ?? "localhost");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `get_system_metrics failed: ${formatError(error)}`,
            },
          ],
        };
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = createMetricsServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("system-metrics MCP server running on stdio");
}

main().catch((error: unknown) => {
  console.error(`MCP server failed: ${formatError(error)}`);
  process.exit(1);
});
