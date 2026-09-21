export type HarnessCode =
  | "timeout"
  | "over_budget"
  | "disallowed_tool"
  | "empty_query";

export interface HarnessOptions {
  maxSteps?: number;
  timeoutMs?: number;
}
