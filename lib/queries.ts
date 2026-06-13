import { db } from "@/lib/db";
import {
  accounts,
  categories,
  recurringTemplates,
  transactions,
  snapshots,
  valuations,
  type Account,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getCategories() {
  return db.select().from(categories).orderBy(categories.kind, categories.name);
}

export async function getTemplatesWithAccount() {
  const rows = await db
    .select({
      t: recurringTemplates,
      accountName: accounts.name,
      categoryName: categories.name,
    })
    .from(recurringTemplates)
    .leftJoin(accounts, eq(recurringTemplates.accountId, accounts.id))
    .leftJoin(categories, eq(recurringTemplates.categoryId, categories.id))
    .orderBy(desc(recurringTemplates.active), recurringTemplates.dayOfMonth);
  return rows.map((r) => ({
    ...r.t,
    accountName: r.accountName,
    categoryName: r.categoryName,
  }));
}

export async function getActiveAccounts(): Promise<Account[]> {
  const all = await db.select().from(accounts).orderBy(accounts.createdAt);
  return all.filter((a) => !a.archived);
}

export type TxnRow = {
  id: number;
  amountPaise: number;
  direction: "in" | "out";
  kind: string;
  date: string;
  note: string | null;
  dueId: number | null;
  categoryName: string | null;
  accountName: string | null;
  targetName: string | null;
};

export async function getTransactions(limit = 200): Promise<TxnRow[]> {
  const a1 = accounts;
  const rows = await db
    .select({
      id: transactions.id,
      amountPaise: transactions.amountPaise,
      direction: transactions.direction,
      kind: transactions.kind,
      date: transactions.date,
      note: transactions.note,
      dueId: transactions.dueId,
      categoryName: categories.name,
      accountName: a1.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(a1, eq(transactions.accountId, a1.id))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);
  return rows.map((r) => ({ ...r, targetName: null }));
}

export async function getSnapshots() {
  return db.select().from(snapshots).orderBy(snapshots.month);
}

export async function getValuations(accountId: number) {
  return db
    .select()
    .from(valuations)
    .where(eq(valuations.accountId, accountId))
    .orderBy(valuations.asOf);
}
