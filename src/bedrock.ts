import { BedrockEmbeddings, ChatBedrockConverse } from "@langchain/aws";
import { CHAT_MODEL, EMBED_MODEL, getAwsRegion } from "./config.js";

export function createChatModel(options?: {
  temperature?: number;
  maxTokens?: number;
}): ChatBedrockConverse {
  return new ChatBedrockConverse({
    model: CHAT_MODEL,
    region: getAwsRegion(),
    temperature: options?.temperature ?? 0,
    maxTokens: options?.maxTokens ?? 1024,
  });
}

export function createEmbeddings(): BedrockEmbeddings {
  return new BedrockEmbeddings({
    model: EMBED_MODEL,
    region: getAwsRegion(),
  });
}
