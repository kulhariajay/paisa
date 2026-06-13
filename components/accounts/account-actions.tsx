"use client";

import { FormDialog, ConfirmButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import {
  updateAccountBalance,
  revalueInvestment,
  setPrimaryAccount,
  archiveAccount,
} from "@/app/actions";
import type { Account } from "@/lib/db/schema";
import { toRupees } from "@/lib/paise";
import { Pencil, Star, Archive } from "lucide-react";

export function AccountActions({ account }: { account: Account }) {
  const isInvestment = account.type === "investment";
  return (
    <div className="flex items-center gap-1">
      {account.type === "cash_bank" &&
        (account.isPrimary ? (
          <Badge tone="primary">
            <Star className="h-3 w-3" /> Primary
          </Badge>
        ) : (
          <ConfirmButton onConfirm={() => setPrimaryAccount(account.id)}>
            <Star className="h-3.5 w-3.5" /> Make primary
          </ConfirmButton>
        ))}

      <FormDialog
        title={isInvestment ? "Update value" : "Edit balance"}
        description={
          isInvestment
            ? "Record today's market value. We keep the history for your growth chart."
            : "Set the current balance for this account."
        }
        action={isInvestment ? revalueInvestment : updateAccountBalance}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      >
        <input type="hidden" name="id" value={account.id} />
        <div>
          <Label>{isInvestment ? "Current value (₹)" : "Balance (₹)"}</Label>
          <Input
            name={isInvestment ? "value" : "balance"}
            type="number"
            step="0.01"
            min="0"
            defaultValue={toRupees(account.balancePaise)}
            autoFocus
          />
        </div>
      </FormDialog>

      <ConfirmButton
        variant="ghost"
        message={`Archive "${account.name}"? It will be hidden from lists.`}
        onConfirm={() => archiveAccount(account.id)}
      >
        <Archive className="h-4 w-4" />
      </ConfirmButton>
    </div>
  );
}
