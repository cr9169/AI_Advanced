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
import {
  citationsFromChunks,
  citationsAreGrounded,
} from "./rag/citations.js";
import {
  formatChunksForPrompt,
  retrieveChunks,
} from "./rag/store.js";
import { isRoute, type AgentResult, type Citation, type Route } from "./types.js";

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
  citations: Annotation<Citation[]>({
    reducer: (_left: Citation[], right: Citation[]) => right,
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
): Promise<{ documents: string[]; citations: Citation[]; answer: string }> {
  try {
    const chunks = await retrieveChunks(store, state.query);
    const context = formatChunksForPrompt(chunks);
    const citations = citationsFromChunks(chunks);

    const model = createChatModel({ temperature: 0, maxTokens: 800 });
    const response = await model.invoke([
      new SystemMessage(
        "You are a grounded technical assistant. Answer using ONLY the provided context. Cite supporting chunks as [1], [2], etc. If the context is insufficient, say so. Do not invent files or facts.",
      ),
      new HumanMessage(`Context:\n${context}\n\nQuestion: ${state.query}`),
    ]);

    let answer = response.text.trim();
    if (answer === "") {
      answer = "The model returned an empty RAG answer.";
    } else if (!citationsAreGrounded(answer, chunks)) {
      answer = `${answer}\n\n(Note: some citations were not in the retrieved set.)`;
    }

    return {
      documents: chunks.map((chunk) => `${chunk.source}: ${chunk.content}`),
      citations,
      answer,
    };
  } catch (error: unknown) {
    return {
      documents: [],
      citations: [],
      answer: `RAG node failed: ${formatError(error)}`,
    };
  }
}

async function generalNode(
  state: AgentStateType,
): Promise<{ documents: string[]; citations: Citation[]; answer: string }> {
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
      citations: [],
      answer:
        answer === ""
          ? "The model returned an empty general answer."
          : answer,
    };
  } catch (error: unknown) {
    return {
      documents: [],
      citations: [],
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
    citations: state.citations,
    answer: state.answer,
  };
}
