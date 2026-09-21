import { ingestKnowledge } from "../../application/ingest.js";
import { formatError } from "../../shared/utils.js";

async function main(): Promise<void> {
  console.log("Ingesting knowledge into pgvector...");
  const result = await ingestKnowledge();
  console.log(`Ingested ${result.chunks} chunks from ${result.files} files.`);
}

main().catch((error: unknown) => {
  console.error(formatError(error));
  process.exit(1);
});
