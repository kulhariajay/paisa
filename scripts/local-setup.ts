/**
 * One-shot local database setup against PGlite (no external Postgres needed).
 * Applies migrations from ./drizzle and seeds default categories.
 * Run with: pnpm db:local
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const DATA_DIR = process.env.PGLITE_DIR || "./.pglite";

const DEFAULT_CATEGORIES: { name: string; kind: "expense" | "income" }[] = [
  { name: "Food & Dining", kind: "expense" },
  { name: "Transport", kind: "expense" },
  { name: "Rent", kind: "expense" },
  { name: "Utilities", kind: "expense" },
  { name: "Groceries", kind: "expense" },
  { name: "Entertainment", kind: "expense" },
  { name: "Shopping", kind: "expense" },
  { name: "Health", kind: "expense" },
  { name: "Family", kind: "expense" },
  { name: "EMI / Loan", kind: "expense" },
  { name: "Investments", kind: "expense" },
  { name: "Miscellaneous", kind: "expense" },
  { name: "Salary", kind: "income" },
  { name: "Bonus", kind: "income" },
  { name: "Interest / Dividend", kind: "income" },
  { name: "Other Income", kind: "income" },
];

async function main() {
  const client = new PGlite(DATA_DIR);
  const db = drizzle(client, { schema });

  console.log("Applying migrations to PGlite at", DATA_DIR, "...");
  await migrate(db, { migrationsFolder: "./drizzle" });

  const existing = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.categories);
  if (Number(existing[0]?.n ?? 0) === 0) {
    await db.insert(schema.categories).values(DEFAULT_CATEGORIES);
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories.`);
  } else {
    console.log("Categories already present, skipping seed.");
  }

  await client.close();
  console.log("Local database ready.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
