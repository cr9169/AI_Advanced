import {
  Annotation,
  END,
  START,
  StateGraph,
  messagesStateReducer,
} from "@langchain/langgraph";
import type { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createChatModel } from "./bedrock.js";
import { formatError } from "./config.js";
import {
  citationsAreGrounded,
  citationsFromChunks,
} from "./rag/citations.js";
import {
  formatChunksForPrompt,
  retrieveChunks,
  type RetrievedChunk,
} from "./rag/store.js";
import {
  executeKnowledgeTool,
} from "./tools/knowledge.js";
import {
  isRoute,
  type AgentResult,
  type Citation,
  type Route,
} from "./types.js";

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
  retrievedContext: Annotation<string>({
    reducer: (_left: string, right: string) => right,
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  toolTrace: Annotation<string[]>({
    reducer: (left: string[], right: string[]) => left.concat(right),
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

async function retrieveNode(
  state: AgentStateType,
  store: MemoryVectorStore,
): Promise<{
  documents: string[];
  citations: Citation[];
  retrievedContext: string;
  messages: BaseMessage[];
}> {
  let chunks: RetrievedChunk[] = [];
  try {
    chunks = await retrieveChunks(store, state.query);
  } catch (error: unknown) {
    chunks = [];
    console.error(`Retrieve skipped: ${formatError(error)}`);
  }

  return {
    documents: chunks.map((chunk) => `${chunk.source}: ${chunk.content}`),
    citations: citationsFromChunks(chunks),
    retrievedContext: formatChunksForPrompt(chunks),
    messages: [new HumanMessage(state.query)],
  };
}

export const knowledgeTools = [
  tool(
    async (input: { path: string }) =>
      executeKnowledgeTool("read_document", input),
    {
      name: "read_document",
      description:
        "Read a markdown file from the knowledge directory by relative path (e.g. rag.md).",
      schema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path relative to knowledge/, e.g. rag.md",
          },
        },
        required: ["path"],
      },
    },
  ),
  tool(
    async (input: { query: string }) =>
      executeKnowledgeTool("search_knowledge", input),
    {
      name: "search_knowledge",
      description:
        "Keyword search over local knowledge files. Does not use embeddings.",
      schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keywords to find in knowledge files",
          },
        },
        required: ["query"],
      },
    },
  ),
];

async function agentNode(state: AgentStateType): Promise<{
  messages: BaseMessage[];
}> {
  const model = createChatModel({ temperature: 0, maxTokens: 800 }).bindTools(
    knowledgeTools,
  );
  const response = await model.invoke([
    new SystemMessage(
      "You research local knowledge files. You may call read_document or search_knowledge. When you have enough, reply briefly with NO tool calls. Do not invent paths.",
    ),
    new SystemMessage(
      `Retrieved chunks:\n${state.retrievedContext || "None yet. Use search_knowledge."}`,
    ),
    ...state.messages,
  ]);
  return { messages: [response] };
}

export async function applyToolCalls(message: AIMessage): Promise<{
  messages: ToolMessage[];
  toolTrace: string[];
}> {
  const calls = message.tool_calls ?? [];
  const messages: ToolMessage[] = [];
  const toolTrace: string[] = [];

  for (const call of calls) {
    const args = { ...(call.args as Record<string, unknown>) };
    const output = await executeKnowledgeTool(call.name, args);
    const toolCallId = call.id ?? call.name;
    messages.push(
      new ToolMessage({
        content: output,
        tool_call_id: toolCallId,
      }),
    );
    toolTrace.push(`${call.name} ${JSON.stringify(args)}`);
  }

  return { messages, toolTrace };
}

async function toolsNode(state: AgentStateType): Promise<{
  messages: BaseMessage[];
  toolTrace: string[];
}> {
  const last = state.messages.at(-1);
  if (!last || !AIMessage.isInstance(last)) {
    return { messages: [], toolTrace: [] };
  }
  return applyToolCalls(last);
}

function routeAfterAgent(state: AgentStateType): "tools" | "generate" {
  const last = state.messages.at(-1);
  if (
    last &&
    AIMessage.isInstance(last) &&
    last.tool_calls !== undefined &&
    last.tool_calls.length > 0
  ) {
    return "tools";
  }
  return "generate";
}

function chunksFromDocuments(documents: string[]): RetrievedChunk[] {
  return documents.map((doc, index) => {
    const split = doc.indexOf(": ");
    const source = split === -1 ? "unknown" : doc.slice(0, split);
    const content = split === -1 ? doc : doc.slice(split + 2);
    return {
      id: `${source}#${index}`,
      source,
      content,
    };
  });
}

async function generateNode(state: AgentStateType): Promise<{
  documents: string[];
  citations: Citation[];
  answer: string;
}> {
  try {
    const extra = state.toolTrace.length
      ? `\n\nTool trace:\n${state.toolTrace.join("\n")}`
      : "";
    const model = createChatModel({ temperature: 0, maxTokens: 800 });
    const response = await model.invoke([
      new SystemMessage(
        "You are a grounded technical assistant. Answer using ONLY the provided context. Cite supporting chunks as [1], [2], etc. If the context is insufficient, say so. Do not invent files or facts.",
      ),
      new HumanMessage(
        `Context:\n${state.retrievedContext}${extra}\n\nQuestion: ${state.query}`,
      ),
    ]);

    const chunks = chunksFromDocuments(state.documents);
    let answer = response.text.trim();
    if (answer === "") {
      answer = "The model returned an empty RAG answer.";
    } else if (chunks.length > 0 && !citationsAreGrounded(answer, chunks)) {
      answer = `${answer}\n\n(Note: some citations were not in the retrieved set.)`;
    }

    return {
      documents: state.documents,
      citations: state.citations,
      answer,
    };
  } catch (error: unknown) {
    return {
      documents: state.documents,
      citations: state.citations,
      answer: `Generate node failed: ${formatError(error)}`,
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

function routeAfterRouter(state: AgentStateType): "retrieve" | "general" {
  return state.route === "technical" ? "retrieve" : "general";
}

export function buildAgent(vectorStore: MemoryVectorStore) {
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
  const state = await graph.invoke(
    { query: trimmed },
    { recursionLimit },
  );
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
