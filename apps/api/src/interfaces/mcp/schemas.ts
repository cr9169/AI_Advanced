import { z } from "zod";

export const GetSystemMetricsInput = z.object({
  host: z
    .string()
    .min(1)
    .optional()
    .describe("Hostname to query. Defaults to localhost."),
});
