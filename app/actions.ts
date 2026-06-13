"use server";

import { db } from "@/lib/db";
import {
  accounts,
  recurringTemplates,
  transactions,
  valuations,
  snapshots,
  type Account,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { toPaise } from "@/lib/paise";
import { computeNetWorth, pickFundingAccount } from "@/lib/finance";
import { currentMonth } from "@/lib/utils";
import {
  markDuePaid,
  undoDuePaid,
  skipDue,
  carryDue,
} from "@/lib/dues";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string): number {
  return Number(fd.get(k) ?? 0);
}
function optNum(fd: FormData, k: string): number | null {
  const v = fd.get(k);
  if (v === null || String(v).trim() === "") return null;
  return Number(v);
}

function revalidateAll() {
  for (const p of [
    "/dashboard",
    "/accounts",
    "/dues",
    "/transactions",
    "/investments",
    "/debts",
    "/month-close",
  ]) {
    revalidatePath(p);
  }
}

/* ------------------------------- Accounts ------------------------------- */

export async function createAccount(fd: FormData) {
  const type = str(fd, "type") as Account["type"];
  const name = str(fd, "name");
  if (!name || !type) throw new Error("Name and type are required");

  const balancePaise = toPaise(num(fd, "balance"));
  const isPrimary = fd.get("isPrimary") === "on";

  const values: typeof accounts.$inferInsert = {
    name,
    type,
    balancePaise,
    isPrimary: type === "cash_bank" ? isPrimary : false,
  };

  if (type === "investment") {
    const invested = optNum(fd, "invested");
    values.investedPaise = invested !== null ? toPaise(invested) : balancePaise;
    values.valuationUpdatedAt = new Date();
  }
  if (type === "bank_loan") {
    values.interestRateBps = Math.round(num(fd, "rate") * 100);
    values.emiPaise = toPaise(num(fd, "emi"));
    values.tenureMonthsLeft = optNum(fd, "tenure") ?? null;
  }
  if (type === "friend_debt_owed_to_me" || type === "friend_debt_i_owe") {
    values.counterparty = str(fd, "counterparty");
  }

  await db.transaction(async (tx) => {
    if (values.isPrimary) {
      await tx.update(accounts).set({ isPrimary: false });
    }
    const [acc] = await tx.insert(accounts).values(values).returning();
    if (type === "investment") {
      await tx
        .insert(valuations)
        .values({ accountId: acc.id, valuePaise: balancePaise });
    }
    if (type === "friend_debt_owed_to_me" || type === "friend_debt_i_owe") {
      await tx.insert(transactions).values({
        accountId: null,
        targetAccountId: acc.id,
        amountPaise: balancePaise,
        direction: type === "friend_debt_owed_to_me" ? "out" : "in",
        kind: "debt_origination",
        date: new Date().toISOString().slice(0, 10),
        note: `Debt opened with ${values.counterparty ?? "friend"}`,
      });
    }
  });
  revalidateAll();
}

export async function updateAccountBalance(fd: FormData) {
  const id = num(fd, "id");
  const balancePaise = toPaise(num(fd, "balance"));
  await db.update(accounts).set({ balancePaise }).where(eq(accounts.id, id));
  revalidateAll();
}

export async function setPrimaryAccount(id: number) {
  await db.transaction(async (tx) => {
    await tx.update(accounts).set({ isPrimary: false });
    await tx.update(accounts).set({ isPrimary: true }).where(eq(accounts.id, id));
  });
  revalidateAll();
}

export async function archiveAccount(id: number) {
  await db.update(accounts).set({ archived: true }).where(eq(accounts.id, id));
  revalidateAll();
}

/* ----------------------------- Investments ------------------------------ */

export async function revalueInvestment(fd: FormData) {
  const id = num(fd, "id");
  const valuePaise = toPaise(num(fd, "value"));
  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ balancePaise: valuePaise, valuationUpdatedAt: new Date() })
      .where(eq(accounts.id, id));
    await tx.insert(valuations).values({ accountId: id, valuePaise });
  });
  revalidateAll();
}

/* ------------------------------ Templates ------------------------------- */

export async function createTemplate(fd: FormData) {
  const name = str(fd, "name");
  const kind = str(fd, "kind") as "emi" | "bill" | "income" | "expense";
  if (!name || !kind) throw new Error("Name and kind required");

  await db.insert(recurringTemplates).values({
    name,
    kind,
    amountPaise: toPaise(num(fd, "amount")),
    amountIsEstimate: fd.get("amountIsEstimate") === "on",
    dayOfMonth: Math.min(31, Math.max(1, num(fd, "dayOfMonth") || 1)),
    accountId: optNum(fd, "accountId"),
    categoryId: optNum(fd, "categoryId"),
    startMonth: str(fd, "startMonth") || currentMonth(),
    active: true,
  });
  revalidateAll();
}

export async function toggleTemplate(id: number, active: boolean) {
  await db
    .update(recurringTemplates)
    .set({ active })
    .where(eq(recurringTemplates.id, id));
  revalidateAll();
}

export async function deleteTemplate(id: number) {
  await db.delete(recurringTemplates).where(eq(recurringTemplates.id, id));
  revalidateAll();
}

/* -------------------------------- Dues ---------------------------------- */

export async function payDue(fd: FormData) {
  const dueId = num(fd, "dueId");
  const confirmedAmountPaise =
    optNum(fd, "amount") !== null ? toPaise(num(fd, "amount")) : undefined;
  const paidDate = str(fd, "date") || undefined;
  await markDuePaid({ dueId, confirmedAmountPaise, paidDate });
  revalidateAll();
}

export async function undoDue(dueId: number) {
  await undoDuePaid(dueId);
  revalidateAll();
}

export async function skipDueAction(dueId: number) {
  await skipDue(dueId);
  revalidateAll();
}

export async function carryDueAction(dueId: number) {
  await carryDue(dueId);
  revalidateAll();
}

/* ----------------------------- Transactions ----------------------------- */

export async function addTransaction(fd: FormData) {
  const direction = (str(fd, "direction") || "out") as "in" | "out";
  const amountPaise = toPaise(num(fd, "amount"));
  if (amountPaise <= 0) throw new Error("Enter an amount");
  const categoryId = optNum(fd, "categoryId");
  const date = str(fd, "date") || new Date().toISOString().slice(0, 10);
  const note = str(fd, "note") || null;

  const accs = await db.select().from(accounts);
  const funding = pickFundingAccount(accs);

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      accountId: funding?.id ?? null,
      amountPaise,
      direction,
      kind: "normal",
      categoryId,
      date,
      note,
    });
    if (funding) {
      const delta = direction === "in" ? amountPaise : -amountPaise;
      await tx
        .update(accounts)
        .set({ balancePaise: funding.balancePaise + delta })
        .where(eq(accounts.id, funding.id));
    }
  });
  revalidateAll();
}

export async function deleteTransaction(id: number) {
  await db.transaction(async (tx) => {
    const [t] = await tx.select().from(transactions).where(eq(transactions.id, id));
    if (!t) return;
    // only reverse plain cash transactions; due-linked txns must be undone via the due
    if (t.dueId) throw new Error("Undo the linked due instead");
    if (t.accountId && t.kind === "normal") {
      const [acc] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, t.accountId));
      if (acc) {
        const delta = t.direction === "in" ? -t.amountPaise : t.amountPaise;
        await tx
          .update(accounts)
          .set({ balancePaise: acc.balancePaise + delta })
          .where(eq(accounts.id, acc.id));
      }
    }
    await tx.delete(transactions).where(eq(transactions.id, id));
  });
  revalidateAll();
}

/* ----------------------------- Friend Debts ----------------------------- */

export async function recordDebtPayment(fd: FormData) {
  const accountId = num(fd, "accountId");
  const amountPaise = toPaise(num(fd, "amount"));
  if (amountPaise <= 0) throw new Error("Enter an amount");

  const accs = await db.select().from(accounts);
  const debt = accs.find((a) => a.id === accountId);
  if (!debt) throw new Error("Debt not found");
  const funding = pickFundingAccount(accs);

  // they owe me -> money comes IN to my cash; I owe them -> money goes OUT
  const cashDirection = debt.type === "friend_debt_owed_to_me" ? "in" : "out";

  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ balancePaise: Math.max(0, debt.balancePaise - amountPaise) })
      .where(eq(accounts.id, debt.id));
    await tx.insert(transactions).values({
      accountId: funding?.id ?? null,
      targetAccountId: debt.id,
      amountPaise,
      direction: cashDirection,
      kind: "transfer",
      date: new Date().toISOString().slice(0, 10),
      note: `Settlement with ${debt.counterparty ?? "friend"}`,
    });
    if (funding) {
      const delta = cashDirection === "in" ? amountPaise : -amountPaise;
      await tx
        .update(accounts)
        .set({ balancePaise: funding.balancePaise + delta })
        .where(eq(accounts.id, funding.id));
    }
  });
  revalidateAll();
}

/* ------------------------------ Month close ----------------------------- */

export async function closeMonth(month: string) {
  const accs = await db.select().from(accounts);
  const nw = computeNetWorth(accs);
  await db
    .insert(snapshots)
    .values({
      month,
      netWorthPaise: nw.netWorthPaise,
      totalAssetsPaise: nw.assetsPaise,
      totalLiabilitiesPaise: nw.liabilitiesPaise,
      investedPaise: nw.investmentsValuePaise,
    })
    .onConflictDoUpdate({
      target: snapshots.month,
      set: {
        netWorthPaise: nw.netWorthPaise,
        totalAssetsPaise: nw.assetsPaise,
        totalLiabilitiesPaise: nw.liabilitiesPaise,
        investedPaise: nw.investmentsValuePaise,
        capturedAt: new Date(),
      },
    });
  revalidateAll();
}
