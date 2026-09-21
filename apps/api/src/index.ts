import type { AgentResult } from "./domain/types.js";
import { runQuery } from "./application/query.js";
import { formatError } from "./shared/utils.js";

const DEFAULT_QUERY =
  "How does the LangGraph router choose RAG vs general?";

function printAgentResult(result: AgentResult): void {
  console.log(`route: ${result.route}`);
  console.log("citations:");
  if (result.citations.length === 0) {
    console.log("  (none)");
  } else {
    for (const citation of result.citations) {
      console.log(`  - ${citation.id}`);
    }
  }
  if (result.toolTrace.length > 0) {
    console.log("toolTrace:");
    for (const item of result.toolTrace) {
      console.log(`  - ${item}`);
    }
  }
  console.log("retrieved chunks:");
  if (result.documents.length === 0) {
    console.log("  (none)");
  } else {
    for (const [index, doc] of result.documents.entries()) {
      console.log(`  [${index + 1}] ${doc}`);
    }
  }
  console.log(`\nanswer:\n${result.answer}`);
}

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(" ").trim() || DEFAULT_QUERY;

  console.log("Opening vector store (pgvector if DATABASE_URL is set)...");
  console.log(`Running query: ${query}\n`);
  const result = await runQuery(query);
  printAgentResult(result);
}

main().catch((error: unknown) => {
  console.error(`CLI failed: ${formatError(error)}`);
  process.exit(1);
});
