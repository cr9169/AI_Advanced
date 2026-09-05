import { HumanMessage } from "@langchain/core/messages";
import { createChatModel, createEmbeddings } from "./bedrock.js";
import { CHAT_MODEL, EMBED_MODEL, formatError, getAwsRegion } from "./config.js";

async function main(): Promise<void> {
  const region = getAwsRegion();
  console.log(`profile=${process.env.AWS_PROFILE} region=${region}`);
  console.log(`embed=${EMBED_MODEL}`);
  console.log(`chat=${CHAT_MODEL}`);

  const vector = await createEmbeddings().embedQuery("ping");
  console.log(`titan ok dims=${vector.length}`);

  const chat = await createChatModel({ maxTokens: 32 }).invoke([
    new HumanMessage("Reply with exactly: ok"),
  ]);
  console.log(`haiku ok text=${chat.text.trim()}`);
}

main().catch((error: unknown) => {
  console.error(`Smoke test failed: ${formatError(error)}`);
  process.exit(1);
});
