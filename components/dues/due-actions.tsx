"use client";

import { FormDialog, ConfirmButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  payDue,
  skipDueAction,
  carryDueAction,
  undoDue,
} from "@/app/actions";
import type { DueWithContext } from "@/lib/dues";
import { toRupees } from "@/lib/paise";
import { Check, Undo2 } from "lucide-react";

export function DueActions({ due }: { due: DueWithContext }) {
  if (due.status === "paid") {
    return (
      <ConfirmButton
        variant="ghost"
        message="Undo this payment? Balances will be restored."
        onConfirm={() => undoDue(due.id)}
      >
        <Undo2 className="h-4 w-4" /> Undo
      </ConfirmButton>
    );
  }

  if (due.status === "skipped") {
    return <span className="text-xs text-muted">Skipped</span>;
  }
  if (due.status === "carried") {
    return <span className="text-xs text-muted">Carried over</span>;
  }

  // pending
  const payQuick = async () => {
    const fd = new FormData();
    fd.set("dueId", String(due.id));
    await payDue(fd);
  };

  return (
    <div className="flex items-center gap-1">
      {due.amountIsEstimate ? (
        <FormDialog
          title={`Pay ${due.templateName}`}
          description="This amount varies — confirm what you’re actually paying."
          action={payDue}
          submitLabel="Mark paid"
          trigger={
            <Button size="sm" variant="primary">
              <Check className="h-4 w-4" /> Pay
            </Button>
          }
        >
          <input type="hidden" name="dueId" value={due.id} />
          <div>
            <Label>Amount (₹)</Label>
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={toRupees(due.amountPaise)}
              autoFocus
            />
          </div>
          <div>
            <Label>Paid on</Label>
            <Input name="date" type="date" defaultValue={today()} />
          </div>
        </FormDialog>
      ) : (
        <ConfirmButton variant="primary" onConfirm={payQuick}>
          <Check className="h-4 w-4" /> Pay
        </ConfirmButton>
      )}

      <ConfirmButton
        variant="ghost"
        message="Skip this item for this month?"
        onConfirm={() => skipDueAction(due.id)}
      >
        Skip
      </ConfirmButton>
      <ConfirmButton
        variant="ghost"
        message="Carry this unpaid item into next month?"
        onConfirm={() => carryDueAction(due.id)}
      >
        Carry
      </ConfirmButton>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
