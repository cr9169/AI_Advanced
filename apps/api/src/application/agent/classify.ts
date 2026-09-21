import type { Route } from "../../domain/types.js";
import { OPERATIONAL_PATTERN, TECHNICAL_PATTERN } from "./constants.js";

export function classifyQuery(query: string): Route {
  const technical = TECHNICAL_PATTERN.test(query);
  const operational = OPERATIONAL_PATTERN.test(query);

  if (technical && !operational) {
    return "technical";
  }
  if (operational && !technical) {
    return "operational";
  }
  if (technical && operational) {
    return "technical";
  }
  return "operational";
}
