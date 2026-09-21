import { END, START, StateGraph } from "@langchain/langgraph";
import type { KnowledgeStore } from "../../domain/rag/types.js";
import { isRoute, type AgentResult } from "../../domain/types.js";
import {
  agentNode,
  generateNode,
  generalNode,
  retrieveNode,
  routeAfterAgent,
  routeAfterRouter,
  routerNode,
  toolsNode,
} from "./nodes.js";
import { AgentState } from "./state.js";

export function buildAgent(vectorStore: KnowledgeStore) {
  return new StateGraph(AgentState)
    .addNode("router", routerNode)
    .addNode("retrieve", (state) => retrieveNode(state, vectorStore))
    .addNode("agent", agentNode)
    .addNode("tools", toolsNode)
    .addNode("generate", generateNode)
    .addNode("general", generalNode)
    .addEdge(START, "router")
    .addConditionalEdges("router", routeAfterRouter, {
      retrieve: "retrieve",
      general: "general",
    })
    .addEdge("retrieve", "agent")
    .addConditionalEdges("agent", routeAfterAgent, {
      tools: "tools",
      generate: "generate",
    })
    .addEdge("tools", "agent")
    .addEdge("generate", END)
    .addEdge("general", END)
    .compile();
}

export type CompiledAgent = ReturnType<typeof buildAgent>;

export async function invokeAgent(
  graph: CompiledAgent,
  query: string,
  options?: { recursionLimit?: number },
): Promise<AgentResult> {
  const trimmed = query.trim();
  if (trimmed === "") {
    throw new Error("Query must be a non-empty string.");
  }

  const recursionLimit = options?.recursionLimit ?? 18;
  const state = await graph.invoke({ query: trimmed }, { recursionLimit });
  if (!isRoute(state.route)) {
    throw new Error("Router did not produce a valid route.");
  }

  return {
    query: state.query,
    route: state.route,
    documents: state.documents,
    citations: state.citations,
    toolTrace: state.toolTrace,
    answer: state.answer,
  };
}
