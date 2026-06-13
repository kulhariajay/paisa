import "dotenv/config";
import { db } from "./index";
import { categories } from "./schema";
import { sql } from "drizzle-orm";

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
  const existing = await db.select({ n: sql<number>`count(*)` }).from(categories);
  if (Number(existing[0]?.n ?? 0) > 0) {
    console.log("Categories already seeded, skipping.");
    return;
  }
  await db.insert(categories).values(DEFAULT_CATEGORIES);
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
