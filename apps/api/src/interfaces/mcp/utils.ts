import type { SystemMetrics } from "./types.js";

export function dummyMetrics(host: string): SystemMetrics {
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

export function textResult(text: string, isError = false) {
  return {
    isError,
    content: [{ type: "text" as const, text }],
  };
}
