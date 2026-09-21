import cors from "cors";
import express, { type Express } from "express";
import { VITE_ORIGINS } from "./constants.js";
import { apiKeyMiddleware, errorHandler } from "./middleware.js";
import { apiRouter } from "./routes.js";

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    cors({
      origin: VITE_ORIGINS,
      allowedHeaders: ["Content-Type", "x-api-key"],
      methods: ["GET", "POST", "OPTIONS"],
    }),
  );
  app.use("/api", apiKeyMiddleware, apiRouter);
  app.use(errorHandler);
  return app;
}
