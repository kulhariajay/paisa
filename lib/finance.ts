import { db } from "@/lib/db";
import { accounts, type Account } from "@/lib/db/schema";

export const ASSET_TYPES = [
  "cash_bank",
  "investment",
  "friend_debt_owed_to_me",
] as const;
export const LIABILITY_TYPES = [
  "bank_loan",
  "credit_card",
  "friend_debt_i_owe",
] as const;

export type NetWorth = {
  assetsPaise: number;
  liabilitiesPaise: number;
  netWorthPaise: number;
  /** current market value of all investment accounts */
  investmentsValuePaise: number;
  /** total cash + bank money */
  cashPaise: number;
};

export function isAsset(type: Account["type"]) {
  return (ASSET_TYPES as readonly string[]).includes(type);
}

/** Compute net worth from a list of (live) accounts. */
export function computeNetWorth(accs: Account[]): NetWorth {
  let assets = 0;
  let liabilities = 0;
  let investments = 0;
  let cash = 0;
  for (const a of accs) {
    if (a.archived) continue;
    if (isAsset(a.type)) assets += a.balancePaise;
    else liabilities += a.balancePaise;
    if (a.type === "investment") investments += a.balancePaise;
    if (a.type === "cash_bank") cash += a.balancePaise;
  }
  return {
    assetsPaise: assets,
    liabilitiesPaise: liabilities,
    netWorthPaise: assets - liabilities,
    investmentsValuePaise: investments,
    cashPaise: cash,
  };
}

/** All non-archived accounts. */
export async function getAccounts(): Promise<Account[]> {
  return db.select().from(accounts).orderBy(accounts.createdAt);
}

/** The funding account for payments: primary cash_bank, else first cash_bank. */
export function pickFundingAccount(accs: Account[]): Account | null {
  const cash = accs.filter((a) => a.type === "cash_bank" && !a.archived);
  return cash.find((a) => a.isPrimary) ?? cash[0] ?? null;
}
