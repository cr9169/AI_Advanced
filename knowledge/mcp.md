# MCP in this project

Model Context Protocol (MCP) servers expose tools over stdio. Cursor starts `src/mcp-server.ts` from `.cursor/mcp.json`. The server registers `get_system_metrics` and returns dummy CPU, memory, disk, uptime, and latency JSON.

The LangGraph agent does not call MCP today. The same tool-server idea will later be reused so the agent can `search_knowledge` and `read_document` through MCP. Until then, treat MCP as a Cursor-only sidecar.
