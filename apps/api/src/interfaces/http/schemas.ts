import { z } from "zod";

export const QueryBodySchema = z.object({
  query: z.string().trim().min(1),
});
