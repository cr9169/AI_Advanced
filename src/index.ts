import { buildAgent, invokeAgent } from "./agent.js";
import { formatError } from "./config.js";
import { createVectorStore } from "./rag/store.js";

const DEFAULT_QUERY =
  "How does the LangGraph router choose RAG vs general?";

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(" ").trim() || DEFAULT_QUERY;

  console.log("Indexing seed documents into MemoryVectorStore...");
  const store = await createVectorStore();
  const graph = buildAgent(store);

  console.log(`Running query: ${query}\n`);
  const result = await invokeAgent(graph, query);

  console.log(`route: ${result.route}`);
  console.log("retrieved documents:");
  if (result.documents.length === 0) {
    console.log("  (none)");
  } else {
    for (const [index, doc] of result.documents.entries()) {
      console.log(`  [${index + 1}] ${doc}`);
    }
  }
  console.log(`\nanswer:\n${result.answer}`);
}

main().catch((error: unknown) => {
  console.error(`CLI failed: ${formatError(error)}`);
  process.exit(1);
});
