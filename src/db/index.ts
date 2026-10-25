import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type DbRuntime = typeof globalThis & { __sensiPool?: Pool };
const globalForDb = globalThis as DbRuntime;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  if (!globalForDb.__sensiPool) {
    globalForDb.__sensiPool = new Pool({
      connectionString,
      max: Number.parseInt(process.env.DB_POOL_MAX ?? "5", 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      allowExitOnIdle: process.env.NODE_ENV !== "production",
    });
  }
  return drizzle(globalForDb.__sensiPool, { schema });
}

export async function checkDatabase() {
  const pool = globalForDb.__sensiPool;
  if (!pool) {
    if (!process.env.DATABASE_URL) return false;
    getDb();
  }
  await globalForDb.__sensiPool!.query("select 1");
  return true;
}
