# LangGraph routing

LangGraph in this repo is a StateGraph.

START goes to a router node. The router is deterministic TypeScript (keyword rules), not an LLM. If the query is classified technical, a conditional edge sends execution to the RAG node. Otherwise it goes to the general node. Both RAG and general then go to END.

There is no agent tool loop yet. MCP is not called from the graph. Deterministic nodes (router, chunking, JSON checks) must not call Bedrock. Non-deterministic nodes call Titan embeddings or Claude Haiku via ChatBedrockConverse.
