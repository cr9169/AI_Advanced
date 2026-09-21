import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { formatError } from "../../shared/utils.js";

const Pool = pg.Pool;

export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  return url === undefined || url === "" ? undefined : url;
}

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  const url = getDatabaseUrl();
  if (url === undefined) {
    throw new Error("DATABASE_URL is not set. Start Docker: npm run db:up");
  }
  pool ??= new Pool({ connectionString: url });
  return pool;
}

export async function pingDatabase(): Promise<boolean> {
  if (getDatabaseUrl() === undefined) {
    return false;
  }
  const result = await getPool().query("SELECT 1 AS ok");
  return (result.rowCount ?? result.rows.length) > 0;
}

export async function ensureSchema(): Promise<void> {
  const sqlPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "schema.sql",
  );
  try {
    const sql = await readFile(sqlPath, "utf8");
    await getPool().query(sql);
  } catch (error: unknown) {
    throw new Error(`Failed to apply schema: ${formatError(error)}`);
  }
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
