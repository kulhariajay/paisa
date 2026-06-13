import { PageHeader, Money } from "@/components/money";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { DueActions } from "@/components/dues/due-actions";
import { ensureDuesGenerated, getDuesForMonth, getPendingDues } from "@/lib/dues";
import { currentMonth, addMonths, monthLabel } from "@/lib/utils";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

const KIND_TONE: Record<string, "primary" | "danger" | "info" | "muted"> = {
  income: "primary",
  emi: "danger",
  bill: "muted",
  expense: "muted",
};

export default async function DuesPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const now = currentMonth();
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : now;

  await ensureDuesGenerated();
  const [dues, allPending] = await Promise.all([
    getDuesForMonth(month),
    getPendingDues(),
  ]);

  const pending = dues.filter((d) => d.status === "pending");
  const done = dues.filter((d) => d.status !== "pending");
  const pendingTotal = pending.reduce((s, d) => s + d.amountPaise, 0);
  const paidTotal = dues
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + d.amountPaise, 0);

  // overdue = pending dues from months before the one being viewed
  const overdue = allPending.filter((d) => d.month < month);

  return (
    <div className="animate-fadeup space-y-5">
      <PageHeader
        title="Dues"
        subtitle="Mark each item paid as it happens. EMIs update your loan balances automatically."
      />

      {/* Month switcher */}
      <div className="flex items-center justify-between">
        <Link href={`/dues?m=${addMonths(month, -1)}`}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
        </Link>
        <div className="text-center">
          <div className="font-semibold">{monthLabel(month)}</div>
          {month !== now && (
            <Link href="/dues" className="text-xs text-primary hover:underline">
              jump to this month
            </Link>
          )}
        </div>
        <Link href={`/dues?m=${addMonths(month, 1)}`}>
          <Button variant="outline" size="sm">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="p-4">
            <p className="text-xs text-muted">Pending this month</p>
            <Money paise={pendingTotal} tone="danger" className="text-xl font-semibold" />
            <p className="mt-0.5 text-xs text-muted">{pending.length} items</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-xs text-muted">Paid this month</p>
            <Money paise={paidTotal} tone="primary" className="text-xl font-semibold" />
          </div>
        </Card>
      </div>

      {/* Overdue from earlier months */}
      {overdue.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {overdue.length} overdue from earlier months
              </span>
            </div>
            <div className="space-y-1">
              {overdue.map((d) => (
                <DueRow key={d.id} due={d} showMonth />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Pending */}
      {pending.length === 0 && done.length === 0 ? (
        <EmptyState
          title="Nothing scheduled for this month"
          hint="Add recurring items (salary, EMIs, rent) on the Accounts page and they’ll appear here automatically."
        >
          <Link href="/accounts">
            <Button variant="outline">Add recurring items</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <Card>
              <div className="divide-y divide-border">
                {pending.map((d) => (
                  <DueRow key={d.id} due={d} />
                ))}
              </div>
            </Card>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-muted">Settled</h2>
              <Card>
                <div className="divide-y divide-border">
                  {done.map((d) => (
                    <DueRow key={d.id} due={d} />
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DueRow({
  due,
  showMonth = false,
}: {
  due: Awaited<ReturnType<typeof getDuesForMonth>>[number];
  showMonth?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = due.status === "pending" && due.dueDate < today;
  const paid = due.status === "paid";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`truncate font-medium ${paid ? "text-muted" : ""}`}>
            {due.templateName}
          </span>
          <Badge tone={KIND_TONE[due.templateKind] ?? "muted"}>{due.templateKind}</Badge>
          {due.targetName && (
            <span className="hidden text-xs text-muted sm:inline">→ {due.targetName}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          <span className={overdue ? "font-medium text-danger" : "text-muted"}>
            {overdue ? "Overdue · " : ""}
            due {due.dueDate}
            {showMonth ? ` (${monthLabel(due.month)})` : ""}
          </span>
          {paid && due.principalPaise != null && (
            <span className="text-muted">
              principal <Money paise={due.principalPaise} compact /> · interest{" "}
              <Money paise={due.interestPaise ?? 0} compact />
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Money
          paise={due.amountPaise}
          tone={due.templateKind === "income" ? "primary" : "none"}
          className="font-semibold"
        />
        <DueActions due={due} />
      </div>
    </div>
  );
}
