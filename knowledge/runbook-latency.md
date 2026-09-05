# Latency incident first checks

This is an operations runbook, not a LangGraph design note.

When users report high latency with high CPU: check recent deploys, error rate, and p95 latency first. Then check CPU saturation, garbage collection, and downstream dependency timeouts. Do not jump to rewriting RAG until those operational signals are ruled out.

Live metrics are not in the knowledge files. Dummy MCP metrics are not production telemetry.
