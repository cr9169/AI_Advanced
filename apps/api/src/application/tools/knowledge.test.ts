import { describe, expect, it } from "vitest";
import { executeKnowledgeTool } from "./knowledge.js";

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
