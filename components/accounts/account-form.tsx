"use client";

import { useState } from "react";
import { Input, Select, Label } from "@/components/ui/input";

const TYPES = [
  { value: "cash_bank", label: "Cash / Bank" },
  { value: "investment", label: "Investment" },
  { value: "bank_loan", label: "Loan (EMI)" },
  { value: "credit_card", label: "Credit Card" },
  { value: "friend_debt_owed_to_me", label: "Friend owes me" },
  { value: "friend_debt_i_owe", label: "I owe a friend" },
];

export function AccountFormFields() {
  const [type, setType] = useState("cash_bank");
  const isLoan = type === "bank_loan";
  const isInvestment = type === "investment";
  const isFriend =
    type === "friend_debt_owed_to_me" || type === "friend_debt_i_owe";
  const isCard = type === "credit_card";

  const balanceLabel = isLoan
    ? "Outstanding balance (₹)"
    : isInvestment
      ? "Current value (₹)"
      : isCard
        ? "Current outstanding (₹)"
        : isFriend
          ? "Amount (₹)"
          : "Current balance (₹)";

  return (
    <>
      <div>
        <Label>Type</Label>
        <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Name</Label>
        <Input
          name="name"
          placeholder={
            isLoan
              ? "e.g. HDFC Car Loan"
              : isInvestment
                ? "e.g. Nippon Index Fund"
                : isFriend
                  ? "e.g. Loan to Rohit"
                  : "e.g. HDFC Savings"
          }
          required
        />
      </div>

      {isFriend && (
        <div>
          <Label>Person</Label>
          <Input name="counterparty" placeholder="e.g. Rohit" required />
        </div>
      )}

      <div>
        <Label>{balanceLabel}</Label>
        <Input name="balance" type="number" step="0.01" min="0" defaultValue="0" />
      </div>

      {isInvestment && (
        <div>
          <Label>Total invested so far (₹) — optional</Label>
          <Input
            name="invested"
            type="number"
            step="0.01"
            min="0"
            placeholder="defaults to current value"
          />
        </div>
      )}

      {isLoan && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Rate % p.a.</Label>
            <Input name="rate" type="number" step="0.01" min="0" placeholder="9.5" />
          </div>
          <div>
            <Label>EMI (₹)</Label>
            <Input name="emi" type="number" step="0.01" min="0" placeholder="15000" />
          </div>
          <div>
            <Label>Months left</Label>
            <Input name="tenure" type="number" min="0" placeholder="36" />
          </div>
        </div>
      )}

      {type === "cash_bank" && (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="isPrimary" className="accent-[var(--primary)]" />
          Use as the default account money flows through
        </label>
      )}
    </>
  );
}
