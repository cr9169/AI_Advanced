import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { buildAgent, classifyQuery, invokeAgent } from "./agent.js";
import { createChatModel } from "./bedrock.js";
import { EVAL_TIMEOUT_MS, formatError } from "./config.js";
import { createVectorStore } from "./rag/store.js";
import type {
  AgentResult,
  DeterministicCheck,
  EvalCaseReport,
  JudgeScores,
  Route,
} from "./types.js";

interface EvalFixture {
  name: string;
  query: string;
  expectedRoute: Route;
}

const FIXTURES: EvalFixture[] = [
  {
    name: "technical-rag",
    query:
      "How does RAG use MemoryVectorStore and Titan embeddings in this project?",
    expectedRoute: "technical",
  },
  {
    name: "operational-general",
    query: "What should I check first during a latency incident with high CPU?",
    expectedRoute: "operational",
  },
];

const JudgeSchema = z.object({
  faithfulness: z.number().int().min(1).max(5),
  relevance: z.number().int().min(1).max(5),
  rationale: z.string().min(1),
});

function check(
  name: string,
  passed: boolean,
  detail: string,
): DeterministicCheck {
  return { name, passed, detail };
}

function isJsonRoundTripValid(result: AgentResult): boolean {
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
      Array.isArray(record.documents)
    );
  } catch {
    return false;
  }
}

function runDeterministicChecks(
  fixture: EvalFixture,
  result: AgentResult,
  durationMs: number,
): DeterministicCheck[] {
  const classified = classifyQuery(fixture.query);
  const classifiedAgain = classifyQuery(fixture.query);
  const classifiedThird = classifyQuery(fixture.query);

  return [
    check(
      "execution_time",
      durationMs < EVAL_TIMEOUT_MS,
      `${durationMs}ms (limit ${EVAL_TIMEOUT_MS}ms)`,
    ),
    check(
      "json_output_valid",
      isJsonRoundTripValid(result),
      "AgentResult is JSON-serializable with required fields",
    ),
    check(
      "answer_non_empty",
      result.answer.trim().length > 0,
      result.answer.trim().length > 0
        ? "answer present"
        : "answer was empty",
    ),
    check(
      "documents_non_empty_for_rag",
      result.route !== "technical" || result.documents.length > 0,
      result.route === "technical"
        ? `${result.documents.length} retrieved docs`
        : "not a RAG route",
    ),
    check(
      "route_matches_classifier",
      result.route === classified && classified === fixture.expectedRoute,
      `graph=${result.route} classifier=${classified} expected=${fixture.expectedRoute}`,
    ),
    check(
      "router_deterministic",
      classified === classifiedAgain && classifiedAgain === classifiedThird,
      "classifyQuery returned the same route three times",
    ),
  ];
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Judge response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

async function judgeRag(result: AgentResult): Promise<JudgeScores> {
  const model = createChatModel({ temperature: 0, maxTokens: 400 });
  const context =
    result.documents.length > 0
      ? result.documents.map((doc, i) => `[${i + 1}] ${doc}`).join("\n\n")
      : "(no documents)";

  const response = await model.invoke([
    new SystemMessage(
      'You are a strict RAG evaluator. Score Faithfulness (answer is supported by context) and Relevance (answer addresses the question) from 1 to 5 integers. Respond with JSON only: {"faithfulness":n,"relevance":n,"rationale":"..."}',
    ),
    new HumanMessage(
      `Question:\n${result.query}\n\nContext:\n${context}\n\nAnswer:\n${result.answer}`,
    ),
  ]);

  const parsed = extractJsonObject(response.text);
  return JudgeSchema.parse(parsed);
}

function printReport(reports: EvalCaseReport[]): boolean {
  let failed = false;

  for (const report of reports) {
    console.log(`\n=== ${report.query}`);
    console.log(`route=${report.route} duration=${report.durationMs}ms`);
    for (const item of report.checks) {
      const mark = item.passed ? "PASS" : "FAIL";
      if (!item.passed) {
        failed = true;
      }
      console.log(`  [${mark}] ${item.name}: ${item.detail}`);
    }
    if (report.judge) {
      console.log(
        `  [JUDGE] faithfulness=${report.judge.faithfulness} relevance=${report.judge.relevance}`,
      );
      console.log(`          ${report.judge.rationale}`);
    }
  }

  const totalChecks = reports.reduce(
    (sum, report) => sum + report.checks.length,
    0,
  );
  const passedChecks = reports.reduce(
    (sum, report) =>
      sum + report.checks.filter((item) => item.passed).length,
    0,
  );
  console.log(`\nDeterministic checks: ${passedChecks}/${totalChecks} passed`);
  return failed;
}

async function main(): Promise<void> {
  const store = await createVectorStore();
  const graph = buildAgent(store);
  const reports: EvalCaseReport[] = [];

  for (const fixture of FIXTURES) {
    console.log(`Evaluating ${fixture.name}...`);
    const started = Date.now();
    const result = await invokeAgent(graph, fixture.query);
    const durationMs = Date.now() - started;
    const checks = runDeterministicChecks(fixture, result, durationMs);

    let judge: JudgeScores | undefined;
    if (result.route === "technical") {
      try {
        judge = await judgeRag(result);
      } catch (error: unknown) {
        checks.push(
          check(
            "llm_judge_parseable",
            false,
            `Judge failed: ${formatError(error)}`,
          ),
        );
      }
    }

    reports.push({
      query: fixture.query,
      route: result.route,
      durationMs,
      checks,
      judge,
    });
  }

  const failed = printReport(reports);
  if (failed) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(`Eval run failed: ${formatError(error)}`);
  process.exit(1);
});
