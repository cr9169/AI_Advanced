import type { EvalFixture } from "./types.js";

export const FIXTURES: EvalFixture[] = [
  {
    name: "technical-rag",
    query:
      "How does file RAG chunk markdown and cite sources in this project?",
    expectedRoute: "technical",
  },
  {
    name: "operational-general",
    query: "What should I check first during a latency incident with high CPU?",
    expectedRoute: "operational",
  },
];
