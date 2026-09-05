export const ROUTES = ["technical", "operational"] as const;
export type Route = (typeof ROUTES)[number];

export interface Citation {
  id: string;
  source: string;
}

export interface AgentResult {
  query: string;
  route: Route;
  documents: string[];
  citations: Citation[];
  toolTrace: string[];
  answer: string;
}

export interface JudgeScores {
  faithfulness: number;
  relevance: number;
  rationale: string;
}

export interface DeterministicCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface EvalCaseReport {
  query: string;
  route: Route;
  durationMs: number;
  checks: DeterministicCheck[];
  judge: JudgeScores | undefined;
}

export function isRoute(value: unknown): value is Route {
  return value === "technical" || value === "operational";
}
