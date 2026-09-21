import {
  Annotation,
  messagesStateReducer,
} from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import type { Citation, Route } from "../../domain/types.js";

export const AgentState = Annotation.Root({
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

export type AgentStateType = typeof AgentState.State;
