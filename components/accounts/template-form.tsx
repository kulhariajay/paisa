"use client";

import { useState } from "react";
import { Input, Select, Label } from "@/components/ui/input";
import { currentMonth } from "@/lib/utils";
import type { Account, Category } from "@/lib/db/schema";

export function TemplateFormFields({
  accounts,
  categories,
}: {
  accounts: Pick<Account, "id" | "name" | "type">[];
  categories: Pick<Category, "id" | "name" | "kind">[];
}) {
  const [kind, setKind] = useState("bill");
  const isIncome = kind === "income";
  const isEmi = kind === "emi";

  const targetAccounts = isEmi
    ? accounts.filter((a) => a.type === "bank_loan")
    : accounts.filter((a) =>
        ["credit_card", "investment", "bank_loan"].includes(a.type),
      );

  const cats = categories.filter((c) =>
    isIncome ? c.kind === "income" : c.kind === "expense",
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Kind</Label>
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="bill">Bill / Fixed expense</option>
            <option value="emi">EMI (loan)</option>
            <option value="income">Income (e.g. salary)</option>
            <option value="expense">Recurring expense</option>
          </Select>
        </div>
        <div>
          <Label>Day of month</Label>
          <Input name="dayOfMonth" type="number" min="1" max="31" defaultValue="1" />
        </div>
      </div>

      <div>
        <Label>Name</Label>
        <Input
          name="name"
          placeholder={
            isEmi ? "e.g. Car loan EMI" : isIncome ? "e.g. Salary" : "e.g. Rent"
          }
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Amount (₹)</Label>
          <Input name="amount" type="number" step="0.01" min="0" required />
        </div>
        <div>
          <Label>Starts from</Label>
          <Input name="startMonth" type="month" defaultValue={currentMonth()} />
        </div>
      </div>

      {(isEmi || targetAccounts.length > 0) && (
        <div>
          <Label>{isEmi ? "Loan account" : "Linked account (optional)"}</Label>
          <Select name="accountId" defaultValue="">
            <option value="">{isEmi ? "Select loan…" : "None"}</option>
            {targetAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label>Category</Label>
        <Select name="categoryId" defaultValue="">
          <option value="">None</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="amountIsEstimate"
          className="accent-[var(--primary)]"
        />
        Amount varies each month (e.g. credit card statement) — confirm before paying
      </label>
    </>
  );
}
