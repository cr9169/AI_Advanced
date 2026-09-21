import type { AgentResult, DeterministicCheck } from "../../domain/types.js";

export function check(
  name: string,
  passed: boolean,
  detail: string,
): DeterministicCheck {
  return { name, passed, detail };
}

export function isJsonRoundTripValid(result: AgentResult): boolean {
  try {
    const parsed: unknown = JSON.parse(JSON.stringify(result));
    if (typeof parsed !== "object" || parsed === null) {
      return false;
    }
    const record = parsed as Record<string, unknown>;
    return (
      typeof record.query === "string" &&
      typeof record.route === "string" &&
      typeof record.answer === "string" &&
      Array.isArray(record.documents) &&
      Array.isArray(record.citations) &&
      Array.isArray(record.toolTrace)
    );
  } catch {
    return false;
  }
}

export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Judge response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}
