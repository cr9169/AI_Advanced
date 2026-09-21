import type { Route } from "../../domain/types.js";

export interface EvalFixture {
  name: string;
  query: string;
  expectedRoute: Route;
}
