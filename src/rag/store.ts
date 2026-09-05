import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../bedrock.js";
import { formatError, RAG_TOP_K } from "../config.js";

const SEED_DOCUMENTS: Document[] = [
  new Document({
    pageContent:
      "LangGraph routes work by connecting START to a router node, then using a conditional edge. If the router marks a query as technical, the graph calls the RAG node. Otherwise it calls the general node. Both terminal nodes go to END. The router itself is deterministic TypeScript, not an LLM.",
    metadata: { source: "langgraph-routing", topic: "langgraph" },
  }),
  new Document({
    pageContent:
      "Retrieval-augmented generation (RAG) in this project uses MemoryVectorStore for local, zero-cost similarity search. Embeddings come from Amazon Titan Embed Text v2 on AWS Bedrock. The retriever returns the top 3 matching chunks, which are then passed to Claude as grounded context.",
    metadata: { source: "rag-titan", topic: "rag" },
  }),
  new Document({
    pageContent:
      "Model Context Protocol (MCP) servers expose tools over stdio. This lab ships a stdio MCP server that registers get_system_metrics and returns dummy CPU, memory, disk, uptime, and latency JSON. Cursor loads it from .cursor/mcp.json. The LangGraph agent does not call MCP tools.",
    metadata: { source: "mcp-stdio", topic: "mcp" },
  }),
  new Document({
    pageContent:
      "Chat completions use ChatBedrockConverse from @langchain/aws with model anthropic.claude-3-5-sonnet-20240620-v1:0. The Converse API is the supported Bedrock chat interface. Region is read from AWS_REGION. Credentials use the default AWS chain or BEDROCK_AWS_* variables.",
    metadata: { source: "bedrock-converse", topic: "bedrock" },
  }),
  new Document({
    pageContent:
      "Deterministic nodes in LangGraph are pure TypeScript functions with no model calls. They are used for routing, validation, and scoring because the same input always produces the same output. Non-deterministic nodes call Claude or embeddings and can vary between runs.",
    metadata: { source: "deterministic-nodes", topic: "langgraph" },
  }),
];

export async function createVectorStore(): Promise<MemoryVectorStore> {
  try {
    return await MemoryVectorStore.fromDocuments(
      SEED_DOCUMENTS,
      createEmbeddings(),
    );
  } catch (error: unknown) {
    throw new Error(`Failed to index RAG documents: ${formatError(error)}`);
  }
}

export async function retrieveContext(
  store: MemoryVectorStore,
  query: string,
): Promise<string[]> {
  try {
    const hits = await store.similaritySearch(query, RAG_TOP_K);
    return hits.map((doc) => doc.pageContent).filter((text) => text.length > 0);
  } catch (error: unknown) {
    throw new Error(`Vector similarity search failed: ${formatError(error)}`);
  }
}
