import { describe, expect, it } from "vitest";
import { citationsAreGrounded } from "./citations.js";

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
