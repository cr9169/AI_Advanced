import { describe, expect, it } from "vitest";
import { chunkText } from "./chunk.js";

describe("chunkText", () => {
  it("attaches source and chunkId metadata", () => {
    const docs = chunkText(
      "Hello world.\n\nSecond paragraph here.",
      "knowledge/demo.md",
      80,
      10,
    );
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0]?.metadata.source).toBe("knowledge/demo.md");
    expect(String(docs[0]?.metadata.chunkId)).toContain("knowledge/demo.md#");
  });
});
