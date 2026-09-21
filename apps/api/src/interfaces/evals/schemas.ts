import { z } from "zod";

export const JudgeSchema = z.object({
  faithfulness: z.number().int().min(1).max(5),
  relevance: z.number().int().min(1).max(5),
  rationale: z.string().min(1),
});
