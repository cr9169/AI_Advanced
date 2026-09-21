import { z } from "zod";

export const ReadDocumentArgs = z.object({
  path: z
    .string()
    .min(1)
    .describe("Path relative to the knowledge directory, e.g. rag.md"),
});

export const SearchKnowledgeArgs = z.object({
  query: z
    .string()
    .min(1)
    .describe("Substring or keywords to find in knowledge files"),
});
