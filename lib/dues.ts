import { db } from "@/lib/db";
import {
  accounts,
  dues,
  recurringTemplates,
  transactions,
  type Due,
  type RecurringTemplate,
  type Account,
} from "@/lib/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { splitEmi } from "@/lib/emi";
import { pickFundingAccount } from "@/lib/finance";
import {
  currentMonth,
  monthsBetween,
  dueDateFor,
  addMonths,
  lastDayOfMonth,
  parseMonth,
} from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayStr() {
  return dateStr(new Date());
}
function dueDateStr(month: string, day: number) {
  return dateStr(dueDateFor(month, day));
}

/**
 * Lazy, idempotent due generation. For every active template, create a pending
 * due for each month from its start month through the current month that does
 * not already exist. Safe to call on every page load — the partial unique index
 * (template_id, month) WHERE origin_due_id IS NULL makes inserts a no-op when the
 * due is already there. This is deliberately used instead of a cron job.
 */
export async function ensureDuesGenerated(): Promise<void> {
  const now = currentMonth();
  const templates = await db
    .select()
    .from(recurringTemplates)
    .where(eq(recurringTemplates.active, true));
  if (templates.length === 0) return;

  const rows: (typeof dues.$inferInsert)[] = [];
  for (const t of templates) {
    // never backfill before the template existed
    const start = t.startMonth > "0000-00" ? t.startMonth : now;
    for (const m of monthsBetween(start, now)) {
      rows.push({
        templateId: t.id,
        month: m,
        accountId: t.accountId ?? null,
        amountPaise: t.amountPaise,
        dueDate: dueDateStr(m, t.dayOfMonth),
        status: "pending",
      });
    }
  }
  if (rows.length === 0) return;

  // Insert all, skipping any that already exist (idempotent).
  await db.insert(dues).values(rows).onConflictDoNothing();
}

export type DueWithContext = Due & {
  templateName: string;
  templateKind: RecurringTemplate["kind"];
  amountIsEstimate: boolean;
  targetType: Account["type"] | null;
  targetName: string | null;
};

/** Pending + recently relevant dues for a month, joined with context. */
export async function getDuesForMonth(month: string): Promise<DueWithContext[]> {
  const rows = await db
    .select({
      due: dues,
      tName: recurringTemplates.name,
      tKind: recurringTemplates.kind,
      tEstimate: recurringTemplates.amountIsEstimate,
      aType: accounts.type,
      aName: accounts.name,
    })
    .from(dues)
    .innerJoin(recurringTemplates, eq(dues.templateId, recurringTemplates.id))
    .leftJoin(accounts, eq(dues.accountId, accounts.id))
    .where(eq(dues.month, month));

  return rows
    .map((r) => ({
      ...r.due,
      templateName: r.tName,
      templateKind: r.tKind,
      amountIsEstimate: r.tEstimate,
      targetType: r.aType,
      targetName: r.aName,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Count of pending dues across all months up to and including now. */
export async function getPendingDues(): Promise<DueWithContext[]> {
  const now = currentMonth();
  const rows = await db
    .select({
      due: dues,
      tName: recurringTemplates.name,
      tKind: recurringTemplates.kind,
      tEstimate: recurringTemplates.amountIsEstimate,
      aType: accounts.type,
      aName: accounts.name,
    })
    .from(dues)
    .innerJoin(recurringTemplates, eq(dues.templateId, recurringTemplates.id))
    .leftJoin(accounts, eq(dues.accountId, accounts.id))
    .where(and(eq(dues.status, "pending"), lte(dues.month, now)));

  return rows
    .map((r) => ({
      ...r.due,
      templateName: r.tName,
      templateKind: r.tKind,
      amountIsEstimate: r.tEstimate,
      targetType: r.aType,
      targetName: r.aName,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/**
 * Atomically mark a due paid. Writes the funding transaction and applies the
 * balance side-effects appropriate to the target account, in one DB transaction:
 *  - bank_loan   -> reducing-balance EMI split; principal cut from the loan,
 *                   tenure decremented, template deactivated when cleared.
 *  - credit_card -> outstanding reduced; recorded as an expense (statement-total
 *                   model, no per-swipe tracking in v1).
 *  - investment  -> treated as a contribution (invested += amount), money moved
 *                   from cash into the asset (kind=transfer, not an expense).
 *  - friend_debt -> the debt balance reduced.
 *  - income      -> cash increased (e.g. salary received).
 *  - otherwise   -> a plain expense paid from cash.
 */
export async function markDuePaid(opts: {
  dueId: number;
  confirmedAmountPaise?: number;
  paidDate?: string;
}): Promise<void> {
  const { dueId, confirmedAmountPaise, paidDate } = opts;
  await db.transaction(async (tx) => {
    const [due] = await tx.select().from(dues).where(eq(dues.id, dueId));
    if (!due) throw new Error("Due not found");
    if (due.status === "paid") return;

    const [tmpl] = await tx
      .select()
      .from(recurringTemplates)
      .where(eq(recurringTemplates.id, due.templateId));
    if (!tmpl) throw new Error("Template not found");

    const amount = confirmedAmountPaise ?? due.amountPaise;
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    const accs = await tx.select().from(accounts);
    const funding = pickFundingAccount(accs);
    const target = due.accountId
      ? accs.find((a) => a.id === due.accountId) ?? null
      : null;
    const date = paidDate ?? todayStr();

    let direction: "in" | "out" = "out";
    let kind: "normal" | "transfer" = "normal";
    let principalPaise: number | null = null;
    let interestPaise: number | null = null;

    if (target?.type === "bank_loan") {
      const split = splitEmi(target.balancePaise, target.interestRateBps ?? 0, amount);
      principalPaise = split.principalPaise;
      interestPaise = split.interestPaise;
      const newBalance = Math.max(0, target.balancePaise - split.principalPaise);
      const newTenure = Math.max(0, (target.tenureMonthsLeft ?? 0) - 1);
      await tx
        .update(accounts)
        .set({ balancePaise: newBalance, tenureMonthsLeft: newTenure })
        .where(eq(accounts.id, target.id));
      if (newBalance <= 0) {
        await tx
          .update(recurringTemplates)
          .set({ active: false })
          .where(eq(recurringTemplates.id, tmpl.id));
      }
    } else if (target?.type === "credit_card") {
      await tx
        .update(accounts)
        .set({ balancePaise: Math.max(0, target.balancePaise - amount) })
        .where(eq(accounts.id, target.id));
    } else if (target?.type === "investment") {
      kind = "transfer";
      await tx
        .update(accounts)
        .set({
          investedPaise: target.investedPaise + amount,
          balancePaise: target.balancePaise + amount,
          valuationUpdatedAt: new Date(),
        })
        .where(eq(accounts.id, target.id));
    } else if (
      target?.type === "friend_debt_owed_to_me" ||
      target?.type === "friend_debt_i_owe"
    ) {
      await tx
        .update(accounts)
        .set({ balancePaise: Math.max(0, target.balancePaise - amount) })
        .where(eq(accounts.id, target.id));
    }

    if (tmpl.kind === "income") direction = "in";

    if (funding) {
      const delta = direction === "in" ? amount : -amount;
      await tx
        .update(accounts)
        .set({ balancePaise: funding.balancePaise + delta })
        .where(eq(accounts.id, funding.id));
    }

    await tx.insert(transactions).values({
      accountId: funding?.id ?? null,
      targetAccountId: target?.id ?? null,
      amountPaise: amount,
      direction,
      kind,
      categoryId: tmpl.categoryId ?? null,
      dueId: due.id,
      date,
      note: tmpl.name,
    });

    await tx
      .update(dues)
      .set({
        status: "paid",
        paidAt: new Date(),
        amountPaise: amount,
        principalPaise,
        interestPaise,
      })
      .where(eq(dues.id, due.id));
  });
}

/** Reverse a mark-paid: undo all balance side-effects and delete the txn(s). */
export async function undoDuePaid(dueId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [due] = await tx.select().from(dues).where(eq(dues.id, dueId));
    if (!due || due.status !== "paid") return;

    const txns = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.dueId, dueId));

    const accs = await tx.select().from(accounts);
    const target = due.accountId
      ? accs.find((a) => a.id === due.accountId) ?? null
      : null;

    // reverse funding cash movement(s)
    for (const t of txns) {
      if (!t.accountId) continue;
      const acc = accs.find((a) => a.id === t.accountId);
      if (!acc) continue;
      const delta = t.direction === "in" ? -t.amountPaise : t.amountPaise;
      acc.balancePaise += delta; // mutate local copy in case target == funding
      await tx
        .update(accounts)
        .set({ balancePaise: acc.balancePaise })
        .where(eq(accounts.id, acc.id));
    }

    // reverse target side-effects
    if (target) {
      const fresh = accs.find((a) => a.id === target.id)!;
      if (target.type === "bank_loan") {
        await tx
          .update(accounts)
          .set({
            balancePaise: fresh.balancePaise + (due.principalPaise ?? 0),
            tenureMonthsLeft: (fresh.tenureMonthsLeft ?? 0) + 1,
          })
          .where(eq(accounts.id, target.id));
        // re-activate template if it was auto-deactivated
        await tx
          .update(recurringTemplates)
          .set({ active: true })
          .where(eq(recurringTemplates.id, due.templateId));
      } else if (target.type === "credit_card") {
        await tx
          .update(accounts)
          .set({ balancePaise: fresh.balancePaise + due.amountPaise })
          .where(eq(accounts.id, target.id));
      } else if (target.type === "investment") {
        await tx
          .update(accounts)
          .set({
            investedPaise: Math.max(0, fresh.investedPaise - due.amountPaise),
            balancePaise: Math.max(0, fresh.balancePaise - due.amountPaise),
          })
          .where(eq(accounts.id, target.id));
      } else if (
        target.type === "friend_debt_owed_to_me" ||
        target.type === "friend_debt_i_owe"
      ) {
        await tx
          .update(accounts)
          .set({ balancePaise: fresh.balancePaise + due.amountPaise })
          .where(eq(accounts.id, target.id));
      }
    }

    await tx.delete(transactions).where(eq(transactions.dueId, dueId));
    await tx
      .update(dues)
      .set({ status: "pending", paidAt: null, principalPaise: null, interestPaise: null })
      .where(eq(dues.id, dueId));
  });
}

/** Mark a due skipped this month (no financial effect). */
export async function skipDue(dueId: number): Promise<void> {
  await db.update(dues).set({ status: "skipped" }).where(eq(dues.id, dueId));
}

/**
 * Carry an unpaid due into next month: mark it carried and create a linked due
 * (origin_due_id set, so it's exempt from the generation uniqueness key).
 */
export async function carryDue(dueId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [due] = await tx.select().from(dues).where(eq(dues.id, dueId));
    if (!due || due.status === "paid") return;
    const next = addMonths(due.month, 1);
    const { year, month0 } = parseMonth(next);
    // keep same day-of-month, clamped
    const day = Math.min(Number(due.dueDate.slice(8, 10)), lastDayOfMonth(next));
    const nextDue = `${year}-${pad(month0 + 1)}-${pad(day)}`;
    await tx.update(dues).set({ status: "carried" }).where(eq(dues.id, dueId));
    await tx.insert(dues).values({
      templateId: due.templateId,
      month: next,
      accountId: due.accountId,
      amountPaise: due.amountPaise,
      dueDate: nextDue,
      status: "pending",
      originDueId: due.id,
    });
  });
}
