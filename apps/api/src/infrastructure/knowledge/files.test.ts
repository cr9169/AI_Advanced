import { describe, expect, it } from "vitest";
import { resolveSafeKnowledgePath } from "./files.js";
import { sanitizeKnowledgeKey } from "./s3.js";
import { searchKnowledgeSources } from "./source.js";

describe("knowledge path sandbox", () => {
  it("rejects parent-directory escapes", () => {
    expect(() => resolveSafeKnowledgePath("../secrets.env")).toThrow(
      /escapes knowledge directory/,
    );
  });

  it("rejects parent-directory S3 keys", () => {
    expect(() => sanitizeKnowledgeKey("../secrets.env")).toThrow(
      /Invalid knowledge path/,
    );
  });
});

describe("searchKnowledgeSources", () => {
  it("finds titan in rag.md", async () => {
    const hits = await searchKnowledgeSources("Titan Text Embeddings");
    expect(hits.some((hit) => hit.path.includes("rag.md"))).toBe(true);
  });
});
