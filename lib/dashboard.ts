import { db } from "@/lib/db";
import {
  accounts,
  transactions,
  categories,
  snapshots,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { computeNetWorth, type NetWorth } from "@/lib/finance";
import { monthsToPayoff } from "@/lib/emi";
import { toRupees } from "@/lib/paise";
import { currentMonth, addMonths, monthLabel } from "@/lib/utils";

export type DashboardData = {
  netWorth: NetWorth;
  totalDebtPaise: number;
  pendingCount: number;
  pendingTotalPaise: number;
  debtFreeMonth: string | null; // "YYYY-MM" or null
  netWorthSeries: { month: string; net: number }[];
  incomeExpense: { month: string; income: number; expense: number }[];
  categoryBreakdown: { name: string; value: number }[];
  debtBreakdown: { name: string; value: number }[];
  investments: { name: string; invested: number; value: number }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const accs = await db.select().from(accounts);
  const live = accs.filter((a) => !a.archived);
  const netWorth = computeNetWorth(live);

  // --- debt breakdown ---
  const debtAccts = live.filter((a) =>
    ["bank_loan", "credit_card", "friend_debt_i_owe"].includes(a.type),
  );
  const totalDebtPaise = debtAccts.reduce((s, a) => s + a.balancePaise, 0);
  const debtBreakdown = debtAccts
    .filter((a) => a.balancePaise > 0)
    .map((a) => ({ name: a.name, value: toRupees(a.balancePaise) }))
    .sort((x, y) => y.value - x.value);

  // --- investments invested vs value ---
  const investments = live
    .filter((a) => a.type === "investment")
    .map((a) => ({
      name: a.name,
      invested: toRupees(a.investedPaise),
      value: toRupees(a.balancePaise),
    }));

  // --- pending dues ---
  const { ensureDuesGenerated, getPendingDues } = await import("@/lib/dues");
  await ensureDuesGenerated();
  const pending = await getPendingDues();
  const pendingCount = pending.length;
  const pendingTotalPaise = pending.reduce((s, d) => s + d.amountPaise, 0);

  // --- debt-free day: latest loan payoff ---
  const loans = live.filter((a) => a.type === "bank_loan" && a.balancePaise > 0);
  let debtFreeMonth: string | null = null;
  if (loans.length > 0) {
    let maxMonths = 0;
    let allFinite = true;
    for (const l of loans) {
      const m = monthsToPayoff(l.balancePaise, l.interestRateBps ?? 0, l.emiPaise ?? 0);
      if (!isFinite(m)) {
        allFinite = false;
        break;
      }
      maxMonths = Math.max(maxMonths, m);
    }
    if (allFinite) debtFreeMonth = addMonths(currentMonth(), maxMonths);
  }

  // --- net worth series (snapshots + live point) ---
  const snaps = await db.select().from(snapshots).orderBy(snapshots.month);
  const series = snaps.map((s) => ({
    month: monthShort(s.month),
    net: toRupees(s.netWorthPaise),
  }));
  series.push({ month: "Now", net: toRupees(netWorth.netWorthPaise) });
  const netWorthSeries = series;

  // --- income vs expense, last 6 months ---
  const txns = await db
    .select({
      amountPaise: transactions.amountPaise,
      direction: transactions.direction,
      kind: transactions.kind,
      date: transactions.date,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .orderBy(desc(transactions.date));

  const now = currentMonth();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(addMonths(now, -i));
  const ieMap = new Map<string, { income: number; expense: number }>();
  for (const m of months) ieMap.set(m, { income: 0, expense: 0 });

  const catMap = new Map<string, number>();
  for (const t of txns) {
    if (t.kind !== "normal") continue; // exclude transfers (investments, settlements)
    const m = t.date.slice(0, 7);
    const bucket = ieMap.get(m);
    if (bucket) {
      if (t.direction === "in") bucket.income += t.amountPaise;
      else bucket.expense += t.amountPaise;
    }
    if (t.direction === "out" && m === now) {
      const key = t.categoryName ?? "Uncategorised";
      catMap.set(key, (catMap.get(key) ?? 0) + t.amountPaise);
    }
  }

  const incomeExpense = months.map((m) => ({
    month: monthShort(m),
    income: toRupees(ieMap.get(m)!.income),
    expense: toRupees(ieMap.get(m)!.expense),
  }));

  const categoryBreakdown = [...catMap.entries()]
    .map(([name, v]) => ({ name, value: toRupees(v) }))
    .sort((a, b) => b.value - a.value);

  return {
    netWorth,
    totalDebtPaise,
    pendingCount,
    pendingTotalPaise,
    debtFreeMonth,
    netWorthSeries,
    incomeExpense,
    categoryBreakdown,
    debtBreakdown,
    investments,
  };
}

function monthShort(m: string): string {
  const label = monthLabel(m); // "June 2026"
  const [mon, yr] = label.split(" ");
  return `${mon.slice(0, 3)} ${yr.slice(2)}`;
}
