import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Driver selection (decided on first query, not at import time):
 *  - DATABASE_URL pointing at a network Postgres (Neon, etc.) -> Neon's
 *    serverless Pool driver: real interactive transactions, Vercel-friendly.
 *  - Otherwise -> PGlite, an in-process Postgres (WASM) persisted to ./.pglite,
 *    so the app runs locally with zero external setup.
 *
 * Both share the same drizzle query-builder surface, so we expose one canonical
 * type. Initialization is lazy (via a Proxy) so merely importing this module
 * never opens a connection — important for Next.js build tracing.
 */

type DB = NeonDatabase<typeof schema>;

function isNetworkPostgres(url: string | undefined): url is string {
  return (
    !!url &&
    (url.startsWith("postgres://") || url.startsWith("postgresql://")) &&
    !url.includes("pglite")
  );
}

function makeNeon(connectionString: string): DB {
  const { Pool, neonConfig } = require("@neondatabase/serverless");
  if (typeof globalThis.WebSocket === "undefined") {
    neonConfig.webSocketConstructor = require("ws");
  }
  const { drizzle } = require("drizzle-orm/neon-serverless");
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

function makePglite(): DB {
  const { PGlite } = require("@electric-sql/pglite");
  const { drizzle } = require("drizzle-orm/pglite");
  const dataDir = process.env.PGLITE_DIR || "./.pglite";
  const client = new PGlite(dataDir);
  return drizzle(client, { schema }) as unknown as DB;
}

const globalForDb = globalThis as unknown as { __db?: DB };

function init(): DB {
  if (globalForDb.__db) return globalForDb.__db;
  const instance = isNetworkPostgres(process.env.DATABASE_URL)
    ? makeNeon(process.env.DATABASE_URL)
    : makePglite();
  if (process.env.NODE_ENV !== "production") globalForDb.__db = instance;
  return instance;
}

let real: DB | undefined;
export const db: DB = new Proxy({} as DB, {
  get(_t, prop, receiver) {
    if (!real) real = init();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
