import { PageHeader, Money } from "@/components/money";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/dialog";
import { QuickAdd } from "@/components/transactions/quick-add";
import { getCategories, getTransactions } from "@/lib/queries";
import { deleteTransaction } from "@/app/actions";
import { monthLabel } from "@/lib/utils";
import { Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export default async function TransactionsPage() {
  const [categories, txns] = await Promise.all([
    getCategories(),
    getTransactions(300),
  ]);

  // group by month
  const groups = new Map<string, typeof txns>();
  for (const t of txns) {
    const m = t.date.slice(0, 7);
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)!.push(t);
  }

  return (
    <div className="animate-fadeup space-y-5">
      <PageHeader
        title="Transactions"
        subtitle="Quick-add expenses and income. Recurring items are recorded automatically when you mark them paid."
      />

      <QuickAdd categories={categories} />

      {txns.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          hint="Add your first expense or income above."
        />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([month, rows]) => {
            const spent = rows
              .filter((r) => r.direction === "out" && r.kind === "normal")
              .reduce((s, r) => s + r.amountPaise, 0);
            const earned = rows
              .filter((r) => r.direction === "in" && r.kind === "normal")
              .reduce((s, r) => s + r.amountPaise, 0);
            return (
              <div key={month}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted">
                    {monthLabel(month)}
                  </h2>
                  <div className="flex gap-3 text-xs">
                    <span className="text-primary tnum">+{fmt(earned)}</span>
                    <span className="text-danger tnum">−{fmt(spent)}</span>
                  </div>
                </div>
                <Card>
                  <div className="divide-y divide-border">
                    {rows.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              t.direction === "in"
                                ? "bg-primary/10 text-primary"
                                : "bg-surface-2 text-muted"
                            }`}
                          >
                            {t.direction === "in" ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {t.note || t.categoryName || "Transaction"}
                              </span>
                              {t.kind === "transfer" && <Badge>transfer</Badge>}
                              {t.dueId && <Badge tone="info">auto</Badge>}
                            </div>
                            <div className="text-xs text-muted">
                              {t.date}
                              {t.categoryName ? ` · ${t.categoryName}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Money
                            paise={t.amountPaise}
                            tone={t.direction === "in" ? "primary" : "none"}
                            className="font-medium"
                          />
                          {!t.dueId && t.kind === "normal" && (
                            <ConfirmButton
                              variant="ghost"
                              message="Delete this transaction?"
                              onConfirm={deleteTransaction.bind(null, t.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </ConfirmButton>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmt(paise: number) {
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(paise / 100))}`;
}
