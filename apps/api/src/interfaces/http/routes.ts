import { Router } from "express";
import { ingestKnowledge } from "../../application/ingest.js";
import { runQuery } from "../../application/query.js";
import { getKnowledgeBucket } from "../../infrastructure/config.js";
import { pingDatabase } from "../../infrastructure/db/client.js";
import { asyncHandler } from "./middleware.js";
import { QueryBodySchema } from "./schemas.js";

export const apiRouter = Router();

apiRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    let database = false;
    try {
      database = await pingDatabase();
    } catch {
      database = false;
    }
    res.json({
      ok: true,
      database,
      bucket: getKnowledgeBucket() ?? null,
    });
  }),
);

apiRouter.post(
  "/ingest",
  asyncHandler(async (_req, res) => {
    const result = await ingestKnowledge();
    res.json(result);
  }),
);

apiRouter.post(
  "/query",
  asyncHandler(async (req, res) => {
    const parsed = QueryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "query is required" });
      return;
    }
    const result = await runQuery(parsed.data.query);
    res.json(result);
  }),
);
