import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { formatChunksForPrompt } from "../../domain/utils.js";
import { citationsAreGrounded, citationsFromChunks } from "../../domain/rag/citations.js";
import type { KnowledgeStore, RetrievedChunk } from "../../domain/rag/types.js";
import { formatError } from "../../shared/utils.js";
import type { Citation, Route } from "../../domain/types.js";
import { createChatModel } from "../../infrastructure/bedrock.js";
import { classifyQuery } from "./classify.js";
import type { AgentStateType } from "./state.js";
import { applyToolCalls, knowledgeTools } from "./tools.js";

export function routerNode(state: AgentStateType): { route: Route } {
  return { route: classifyQuery(state.query) };
}

export async function retrieveNode(
  state: AgentStateType,
  store: KnowledgeStore,
): Promise<{
  documents: string[];
  citations: Citation[];
  retrievedContext: string;
  messages: BaseMessage[];
}> {
  let chunks: RetrievedChunk[] = [];
  try {
    chunks = await store.retrieve(state.query);
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

export async function agentNode(state: AgentStateType): Promise<{
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

export async function toolsNode(state: AgentStateType): Promise<{
  messages: BaseMessage[];
  toolTrace: string[];
}> {
  const last = state.messages.at(-1);
  if (!last || !AIMessage.isInstance(last)) {
    return { messages: [], toolTrace: [] };
  }
  return applyToolCalls(last);
}

export function routeAfterAgent(state: AgentStateType): "tools" | "generate" {
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

export async function generateNode(state: AgentStateType): Promise<{
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

export async function generalNode(
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

export function routeAfterRouter(state: AgentStateType): "retrieve" | "general" {
  return state.route === "technical" ? "retrieve" : "general";
}
