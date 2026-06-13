"use client";

import { FormDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { recordDebtPayment } from "@/app/actions";
import { toRupees } from "@/lib/paise";
import type { Account } from "@/lib/db/schema";

export function RecordPayment({ account }: { account: Account }) {
  const incoming = account.type === "friend_debt_owed_to_me";
  return (
    <FormDialog
      title={incoming ? `Received from ${account.counterparty ?? "friend"}` : `Paid ${account.counterparty ?? "friend"}`}
      description={
        incoming
          ? "Record money your friend paid back."
          : "Record money you paid back to your friend."
      }
      action={recordDebtPayment}
      submitLabel="Record"
      trigger={
        <Button size="sm" variant="outline">
          {incoming ? "Received" : "Paid"}
        </Button>
      }
    >
      <input type="hidden" name="accountId" value={account.id} />
      <div>
        <Label>Amount (₹)</Label>
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          max={toRupees(account.balancePaise)}
          defaultValue={toRupees(account.balancePaise)}
          autoFocus
        />
      </div>
    </FormDialog>
  );
}
