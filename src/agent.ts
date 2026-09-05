import {
  Annotation,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import type { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "./bedrock.js";
import { formatError } from "./config.js";
import { retrieveContext } from "./rag/store.js";
import { isRoute, type AgentResult, type Route } from "./types.js";

const AgentState = Annotation.Root({
  query: Annotation<string>(),
  route: Annotation<Route | undefined>({
    reducer: (_left: Route | undefined, right: Route | undefined) => right,
    default: () => undefined,
  }),
  documents: Annotation<string[]>({
    reducer: (_left: string[], right: string[]) => right,
    default: () => [],
  }),
  answer: Annotation<string>({
    reducer: (_left: string, right: string) => right,
    default: () => "",
  }),
});

type AgentStateType = typeof AgentState.State;

const TECHNICAL_PATTERN =
  /\b(rag|langgraph|langchain|bedrock|embedding|embeddings|mcp|vector|typescript|retriev|titan|claude|converse|graph|router|node|eval)\b/i;

const OPERATIONAL_PATTERN =
  /\b(cpu|memory|disk|uptime|latency|incident|deploy|outage|health|metrics?|alert|p95|throughput)\b/i;

export function classifyQuery(query: string): Route {
  const technical = TECHNICAL_PATTERN.test(query);
  const operational = OPERATIONAL_PATTERN.test(query);

  if (technical && !operational) {
    return "technical";
  }
  if (operational && !technical) {
    return "operational";
  }
  if (technical && operational) {
    return "technical";
  }
  return "operational";
}

function routerNode(state: AgentStateType): { route: Route } {
  return { route: classifyQuery(state.query) };
}

async function ragNode(
  state: AgentStateType,
  store: MemoryVectorStore,
): Promise<{ documents: string[]; answer: string }> {
  try {
    const documents = await retrieveContext(store, state.query);
    const context =
      documents.length > 0
        ? documents.map((doc, index) => `[${index + 1}] ${doc}`).join("\n\n")
        : "No retrieved documents.";

    const model = createChatModel({ temperature: 0, maxTokens: 800 });
    const response = await model.invoke([
      new SystemMessage(
        "You are a grounded technical assistant. Answer using ONLY the provided context. If the context is insufficient, say so. Do not invent facts.",
      ),
      new HumanMessage(`Context:\n${context}\n\nQuestion: ${state.query}`),
    ]);

    const answer = response.text.trim();
    if (answer === "") {
      return {
        documents,
        answer: "The model returned an empty RAG answer.",
      };
    }

    return { documents, answer };
  } catch (error: unknown) {
    return {
      documents: [],
      answer: `RAG node failed: ${formatError(error)}`,
    };
  }
}

async function generalNode(
  state: AgentStateType,
): Promise<{ documents: string[]; answer: string }> {
  try {
    const model = createChatModel({ temperature: 0.2, maxTokens: 600 });
    const response = await model.invoke([
      new SystemMessage(
        "You are a concise operations assistant. Answer the user directly. You do not have live system metrics.",
      ),
      new HumanMessage(state.query),
    ]);

    const answer = response.text.trim();
    return {
      documents: [],
      answer:
        answer === ""
          ? "The model returned an empty general answer."
          : answer,
    };
  } catch (error: unknown) {
    return {
      documents: [],
      answer: `General node failed: ${formatError(error)}`,
    };
  }
}

function routeAfterRouter(state: AgentStateType): "rag" | "general" {
  return state.route === "technical" ? "rag" : "general";
}

export function buildAgent(vectorStore: MemoryVectorStore) {
  return new StateGraph(AgentState)
    .addNode("router", routerNode)
    .addNode("rag", (state) => ragNode(state, vectorStore))
    .addNode("general", generalNode)
    .addEdge(START, "router")
    .addConditionalEdges("router", routeAfterRouter, {
      rag: "rag",
      general: "general",
    })
    .addEdge("rag", END)
    .addEdge("general", END)
    .compile();
}

export type CompiledAgent = ReturnType<typeof buildAgent>;

export async function invokeAgent(
  graph: CompiledAgent,
  query: string,
): Promise<AgentResult> {
  const trimmed = query.trim();
  if (trimmed === "") {
    throw new Error("Query must be a non-empty string.");
  }

  const state = await graph.invoke({ query: trimmed });
  if (!isRoute(state.route)) {
    throw new Error("Router did not produce a valid route.");
  }

  return {
    query: state.query,
    route: state.route,
    documents: state.documents,
    answer: state.answer,
  };
}
