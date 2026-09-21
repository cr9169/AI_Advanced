import type { NextFunction, Request, RequestHandler, Response } from "express";
import { HarnessError } from "../../application/harness.js";
import { getApiKey } from "../../infrastructure/config.js";
import { formatError } from "../../shared/utils.js";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

export function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = getApiKey();
  if (
    expected !== undefined &&
    req.path !== "/health" &&
    req.header("x-api-key") !== expected
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HarnessError && error.code === "empty_query") {
    res.status(400).json({ error: error.message });
    return;
  }
  const status =
    error instanceof HarnessError && error.code === "disallowed_tool"
      ? 400
      : 500;
  res.status(status).json({ error: formatError(error) });
}
