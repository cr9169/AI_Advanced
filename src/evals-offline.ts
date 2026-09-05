import { readFile } from "node:fs/promises";
import path from "node:path";
import { classifyQuery } from "./agent.js";
import { formatError } from "./config.js";
import { searchKnowledge } from "./knowledge/files.js";
import { isRoute, type Route } from "./types.js";

interface GoldenCase {
  id: string;
  query: string;
  expectedRoute: Route;
  expectedSourceSubstr: string;
}

async function loadGolden(): Promise<GoldenCase[]> {
  const file = path.resolve("evals/golden.json");
  const raw = await readFile(file, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("golden.json must be an array");
  }
  return parsed.map((item) => {
    const record = item as Record<string, unknown>;
    const expectedRoute = record.expectedRoute;
    if (!isRoute(expectedRoute)) {
      throw new Error(`Invalid route in ${String(record.id)}`);
    }
    return {
      id: String(record.id),
      query: String(record.query),
      expectedRoute,
      expectedSourceSubstr: String(record.expectedSourceSubstr),
    };
  });
}

export async function runOfflineEvals(): Promise<boolean> {
  const cases = await loadGolden();
  let failed = false;

  for (const item of cases) {
    const route = classifyQuery(item.query);
    const routeOk = route === item.expectedRoute;
    let sourceOk = item.expectedRoute !== "technical";
    let sourceDetail = "skipped (operational)";

    if (item.expectedRoute === "technical") {
      const hits = await searchKnowledge(item.query);
      sourceOk = hits
        .slice(0, 3)
        .some((hit) => hit.path.includes(item.expectedSourceSubstr));
      sourceDetail = sourceOk
        ? hits.map((hit) => hit.path).join(", ")
        : "no matching file";
    }

    const passed = routeOk && sourceOk;
    if (!passed) {
      failed = true;
    }
    const mark = passed ? "PASS" : "FAIL";
    console.log(
      `[${mark}] ${item.id} route=${route} (expected ${item.expectedRoute}) sources=${sourceDetail}`,
    );
  }

  return !failed;
}

async function main(): Promise<void> {
  const ok = await runOfflineEvals();
  if (!ok) {
    process.exit(1);
  }
  console.log("Offline evals passed.");
}

main().catch((error: unknown) => {
  console.error(`Offline evals failed: ${formatError(error)}`);
  process.exit(1);
});
