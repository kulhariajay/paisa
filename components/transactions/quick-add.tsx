"use client";

import { useRef, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addTransaction } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/db/schema";
import { Plus } from "lucide-react";

export function QuickAdd({ categories }: { categories: Category[] }) {
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const cats = categories.filter((c) =>
    direction === "in" ? c.kind === "income" : c.kind === "expense",
  );

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setPending(true);
        try {
          fd.set("direction", direction);
          await addTransaction(fd);
          formRef.current?.reset();
        } finally {
          setPending(false);
        }
      }}
      className="rounded-2xl border border-border bg-surface/80 p-3"
    >
      <div className="mb-3 inline-flex rounded-lg border border-border p-0.5">
        <button
          type="button"
          onClick={() => setDirection("out")}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            direction === "out" ? "bg-danger/15 text-danger" : "text-muted",
          )}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setDirection("in")}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            direction === "in" ? "bg-primary/15 text-primary" : "text-muted",
          )}
        >
          Income
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.2fr_1fr_auto]">
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount ₹"
          inputMode="decimal"
          required
          autoFocus
        />
        <Select name="categoryId" defaultValue="">
          <option value="">Category…</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <Input
          name="note"
          placeholder="Note (optional)"
          className="col-span-2 sm:col-span-1"
        />
      </div>
      <div className="mt-2 flex justify-end">
        <Button type="submit" disabled={pending} size="sm">
          <Plus className="h-4 w-4" /> {pending ? "Adding…" : "Add"}
        </Button>
      </div>
    </form>
  );
}
