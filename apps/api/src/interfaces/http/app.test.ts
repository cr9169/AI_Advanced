import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

let server: Server;
let base = "";

beforeAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server = createApp().listen(0, "127.0.0.1", () => {
        const address = server.address() as AddressInfo;
        base = `http://127.0.0.1:${address.port}`;
        resolve();
      });
      server.on("error", reject);
    }),
);

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
);

describe("Express API", () => {
  it("returns health 200", async () => {
    const response = await fetch(`${base}/api/health`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("rejects empty query with 400", async () => {
    const response = await fetch(`${base}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "" }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/query is required/);
  });
});
