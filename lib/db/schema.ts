import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  serial,
  text,
  bigint,
  integer,
  boolean,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ----------------------------------------------------------------------------
 * Enums
 * ------------------------------------------------------------------------- */

export const accountType = pgEnum("account_type", [
  "cash_bank",
  "investment",
  "bank_loan",
  "credit_card",
  "friend_debt_owed_to_me",
  "friend_debt_i_owe",
]);

export const templateKind = pgEnum("template_kind", [
  "emi",
  "bill",
  "income",
  "expense",
]);

export const dueStatus = pgEnum("due_status", [
  "pending",
  "paid",
  "skipped",
  "carried",
]);

export const txnKind = pgEnum("txn_kind", [
  "normal",
  "adjustment",
  "debt_origination",
  "transfer",
]);

export const txnDirection = pgEnum("txn_direction", ["in", "out"]);

export const categoryKind = pgEnum("category_kind", ["expense", "income"]);

/** Integer-paise money column helper. */
const paise = (name: string) => bigint(name, { mode: "number" });

/* ----------------------------------------------------------------------------
 * accounts — every asset and liability the user holds
 * ------------------------------------------------------------------------- */

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: accountType("type").notNull(),
  /**
   * Semantics depend on type:
   *  cash_bank        -> spendable balance (bank + wallet money)
   *  investment       -> current market value
   *  bank_loan        -> outstanding principal
   *  credit_card      -> current statement due
   *  friend_debt_*    -> net amount still owed
   */
  balancePaise: paise("balance_paise").notNull().default(0),
  /** investments only: total contributed so far */
  investedPaise: paise("invested_paise").notNull().default(0),
  /** loans only: annual interest rate in basis points (1% = 100 bps) */
  interestRateBps: integer("interest_rate_bps"),
  /** loans only: the monthly EMI amount */
  emiPaise: paise("emi_paise"),
  /** loans only: months remaining; auto-deactivates its template at 0 */
  tenureMonthsLeft: integer("tenure_months_left"),
  /** friend debts only: the other person */
  counterparty: text("counterparty"),
  /** investments only: when the value was last refreshed (staleness nudge) */
  valuationUpdatedAt: timestamp("valuation_updated_at"),
  /** the default funding account for payments */
  isPrimary: boolean("is_primary").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ----------------------------------------------------------------------------
 * valuations — append-only log of investment revaluations
 * ------------------------------------------------------------------------- */

export const valuations = pgTable("valuations", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  valuePaise: paise("value_paise").notNull(),
  asOf: timestamp("as_of").notNull().defaultNow(),
});

/* ----------------------------------------------------------------------------
 * recurring_templates — blueprints that generate monthly dues
 * ------------------------------------------------------------------------- */

export const recurringTemplates = pgTable("recurring_templates", {
  id: serial("id").primaryKey(),
  /** nullable for pure income/expense not tied to an account */
  accountId: integer("account_id").references(() => accounts.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  amountPaise: paise("amount_paise").notNull(),
  /** true for variable bills (e.g. credit card statement) needing confirmation */
  amountIsEstimate: boolean("amount_is_estimate").notNull().default(false),
  /** 1-31, clamped to month end when shorter */
  dayOfMonth: integer("day_of_month").notNull(),
  kind: templateKind("kind").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  /** "YYYY-MM" backfill floor — never generates dues before this month */
  startMonth: text("start_month").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ----------------------------------------------------------------------------
 * dues — a single month's instance of a template (the mark-paid unit)
 * ------------------------------------------------------------------------- */

export const dues = pgTable(
  "dues",
  {
    id: serial("id").primaryKey(),
    templateId: integer("template_id")
      .notNull()
      .references(() => recurringTemplates.id, { onDelete: "cascade" }),
    /** "YYYY-MM" */
    month: text("month").notNull(),
    /** the target account this due settles against (loan/card/debt), if any */
    accountId: integer("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    amountPaise: paise("amount_paise").notNull(),
    dueDate: date("due_date").notNull(),
    status: dueStatus("status").notNull().default("pending"),
    paidAt: timestamp("paid_at"),
    /** when carried over from an unpaid earlier due */
    originDueId: integer("origin_due_id"),
    /** EMIs only: the split recorded at payment time */
    principalPaise: paise("principal_paise"),
    interestPaise: paise("interest_paise"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // idempotency key for lazy generation; carried dues (originDueId set) are
    // exempt so a carried EMI can coexist with that month's fresh one.
    genKey: uniqueIndex("dues_template_month_gen_key")
      .on(t.templateId, t.month)
      .where(sql`origin_due_id IS NULL`),
  }),
);

/* ----------------------------------------------------------------------------
 * transactions — the cash-flow ledger (every balance traces back to rows)
 * ------------------------------------------------------------------------- */

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  /** the FUNDING account (money source/sink) — defaults to primary cash_bank */
  accountId: integer("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  /** the account this payment settles against (loan/card/debt/investment) */
  targetAccountId: integer("target_account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  amountPaise: paise("amount_paise").notNull(),
  direction: txnDirection("direction").notNull(),
  kind: txnKind("kind").notNull().default("normal"),
  categoryId: integer("category_id").references(() => categories.id),
  /** link back to the due that generated this txn (for clean undo) */
  dueId: integer("due_id"),
  date: date("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ----------------------------------------------------------------------------
 * snapshots — net-worth history, written at month-close
 * ------------------------------------------------------------------------- */

export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  /** "YYYY-MM" — one row per month, re-closable (overwritten) */
  month: text("month").notNull().unique(),
  netWorthPaise: paise("net_worth_paise").notNull(),
  totalAssetsPaise: paise("total_assets_paise").notNull(),
  totalLiabilitiesPaise: paise("total_liabilities_paise").notNull(),
  investedPaise: paise("invested_paise").notNull(),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
});

/* ----------------------------------------------------------------------------
 * categories — expense/income tags
 * ------------------------------------------------------------------------- */

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: categoryKind("kind").notNull(),
});

/* ----------------------------------------------------------------------------
 * Inferred types
 * ------------------------------------------------------------------------- */

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Valuation = typeof valuations.$inferSelect;
export type RecurringTemplate = typeof recurringTemplates.$inferSelect;
export type NewRecurringTemplate = typeof recurringTemplates.$inferInsert;
export type Due = typeof dues.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Snapshot = typeof snapshots.$inferSelect;
export type Category = typeof categories.$inferSelect;
