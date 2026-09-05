import { AIMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { applyToolCalls, classifyQuery } from "./agent.js";
import { citationsAreGrounded } from "./rag/citations.js";
import { chunkText } from "./rag/chunk.js";
import {
  resolveSafeKnowledgePath,
  searchKnowledge,
} from "./knowledge/files.js";
import { executeKnowledgeTool } from "./tools/knowledge.js";

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

describe("chunkText", () => {
  it("attaches source and chunkId metadata", () => {
    const docs = chunkText("Hello world.\n\nSecond paragraph here.", "knowledge/demo.md", 80, 10);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0]?.metadata.source).toBe("knowledge/demo.md");
    expect(String(docs[0]?.metadata.chunkId)).toContain("knowledge/demo.md#");
  });
});

describe("citationsAreGrounded", () => {
  const chunks = [
    { id: "a#0", source: "a.md", content: "one" },
    { id: "b#0", source: "b.md", content: "two" },
  ];

  it("accepts in-range [n] citations", () => {
    expect(citationsAreGrounded("See [1] and [2].", chunks)).toBe(true);
  });

  it("rejects out-of-range citations", () => {
    expect(citationsAreGrounded("See [3].", chunks)).toBe(false);
  });
});

describe("knowledge path sandbox", () => {
  it("rejects parent-directory escapes", () => {
    expect(() => resolveSafeKnowledgePath("../secrets.env")).toThrow(
      /escapes knowledge directory/,
    );
  });
});

describe("executeKnowledgeTool", () => {
  it("rejects metrics tool in the graph allowlist", async () => {
    await expect(
      executeKnowledgeTool("get_system_metrics", {}),
    ).rejects.toThrow(/Disallowed tool/);
  });

  it("reads rag.md", async () => {
    const text = await executeKnowledgeTool("read_document", { path: "rag.md" });
    expect(text).toMatch(/File RAG/);
  });
});

describe("searchKnowledge", () => {
  it("finds titan in rag.md", async () => {
    const hits = await searchKnowledge("Titan Text Embeddings");
    expect(hits.some((hit) => hit.path.includes("rag.md"))).toBe(true);
  });
});

describe("applyToolCalls", () => {
  it("executes read_document without an LLM", async () => {
    const message = new AIMessage({
      content: "",
      tool_calls: [
        {
          name: "read_document",
          args: { path: "mcp.md" },
          id: "call-1",
          type: "tool_call",
        },
      ],
    });
    const result = await applyToolCalls(message);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatch(/Model Context Protocol/);
    expect(result.toolTrace[0]).toMatch(/read_document/);
  });
});
