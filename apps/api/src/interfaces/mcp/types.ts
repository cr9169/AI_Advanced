export interface SystemMetrics {
  host: string;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  uptimeSeconds: number;
  requestLatencyMs: number;
  timestamp: string;
}
