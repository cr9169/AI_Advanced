import { describe, expect, it } from "vitest";
import { classifyQuery } from "./classify.js";

describe("classifyQuery", () => {
  it("routes langgraph questions as technical", () => {
    expect(
      classifyQuery("How does the LangGraph router choose RAG vs general?"),
    ).toBe("technical");
  });

  it("routes latency incidents as operational", () => {
    expect(
      classifyQuery(
        "What should I check first during a latency incident with high CPU?",
      ),
    ).toBe("operational");
  });
});
