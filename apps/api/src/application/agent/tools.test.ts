import { AIMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { applyToolCalls } from "./tools.js";

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
