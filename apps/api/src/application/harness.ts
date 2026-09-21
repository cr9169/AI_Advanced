import type { AgentResult } from "../domain/types.js";
import {
  HARNESS_MAX_STEPS,
  HARNESS_TIMEOUT_MS,
} from "../infrastructure/config.js";
import { invokeAgent, type CompiledAgent } from "./agent/graph.js";
import type { HarnessCode, HarnessOptions } from "./types.js";

export type { HarnessCode, HarnessOptions };

export class HarnessError extends Error {
  readonly code: HarnessCode;

  constructor(message: string, code: HarnessCode) {
    super(message);
    this.name = "HarnessError";
    this.code = code;
  }
}

export async function runWithHarness(
  graph: CompiledAgent,
  query: string,
  options: HarnessOptions = {},
): Promise<AgentResult> {
  const trimmed = query.trim();
  if (trimmed === "") {
    throw new HarnessError("Query must be a non-empty string.", "empty_query");
  }

  const maxSteps = options.maxSteps ?? HARNESS_MAX_STEPS;
  const timeoutMs = options.timeoutMs ?? HARNESS_TIMEOUT_MS;
  const recursionLimit = Math.max(8, maxSteps * 3);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new HarnessError(
          `Agent exceeded timeout of ${timeoutMs}ms.`,
          "timeout",
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      invokeAgent(graph, trimmed, { recursionLimit }),
      timeout,
    ]);
  } catch (error: unknown) {
    if (error instanceof HarnessError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("recursion")) {
      throw new HarnessError(
        `Agent exceeded max steps (${maxSteps}).`,
        "over_budget",
      );
    }
    if (message.startsWith("Disallowed tool:")) {
      throw new HarnessError(message, "disallowed_tool");
    }
    throw error;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
