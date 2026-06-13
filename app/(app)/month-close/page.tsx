import { PageHeader, Money } from "@/components/money";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/dialog";
import { closeMonth } from "@/app/actions";
import {
  getActiveAccounts,
  getSnapshots,
} from "@/lib/queries";
import { ensureDuesGenerated, getDuesForMonth } from "@/lib/dues";
import { computeNetWorth } from "@/lib/finance";
import { currentMonth, addMonths, monthLabel } from "@/lib/utils";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const STALE_DAYS = 30;

export default async function MonthClosePage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const now = currentMonth();
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : now;

  await ensureDuesGenerated();
  const [accs, snaps, dues] = await Promise.all([
    getActiveAccounts(),
    getSnapshots(),
    getDuesForMonth(month),
  ]);

  const nw = computeNetWorth(accs);
  const unpaid = dues.filter((d) => d.status === "pending");
  const staleInvestments = accs.filter(
    (a) => a.type === "investment" && isStale(a.valuationUpdatedAt),
  );
  const existing = snaps.find((s) => s.month === month);

  return (
    <div className="animate-fadeup space-y-5">
      <PageHeader
        title="Month Close"
        subtitle="Snapshot your net worth so the history chart has a real point for this month."
      />

      <div className="flex items-center justify-between">
        <Link href={`/month-close?m=${addMonths(month, -1)}`}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
        </Link>
        <div className="text-center font-semibold">{monthLabel(month)}</div>
        <Link href={`/month-close?m=${addMonths(month, 1)}`}>
          <Button variant="outline" size="sm">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Net worth preview */}
      <Card>
        <CardBody>
          <p className="text-xs text-muted">Net worth right now</p>
          <Money paise={nw.netWorthPaise} tone="auto" className="text-3xl font-semibold" />
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">Assets</p>
              <Money paise={nw.assetsPaise} tone="primary" />
            </div>
            <div>
              <p className="text-xs text-muted">Liabilities</p>
              <Money paise={nw.liabilitiesPaise} tone="danger" />
            </div>
            <div>
              <p className="text-xs text-muted">Invested value</p>
              <Money paise={nw.investmentsValuePaise} tone="info" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Checklist */}
      <div className="space-y-3">
        <ChecklistItem
          ok={unpaid.length === 0}
          okText="All dues for this month are settled"
          warnText={`${unpaid.length} due${unpaid.length === 1 ? "" : "s"} still pending`}
          href={`/dues?m=${month}`}
          action="Review dues"
        />
        <ChecklistItem
          ok={staleInvestments.length === 0}
          okText="Investment values are fresh"
          warnText={`${staleInvestments.length} investment value${
            staleInvestments.length === 1 ? "" : "s"
          } not updated in ${STALE_DAYS}+ days`}
          href="/investments"
          action="Update values"
        />
      </div>

      {/* Close action */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">
              {existing ? "Re-close this month" : "Close this month"}
            </p>
            <p className="text-sm text-muted">
              {existing
                ? `Last snapshot: ${monthLabel(month)} · `
                : "Writes a net-worth snapshot you can see on the dashboard. "}
              {existing && <Money paise={existing.netWorthPaise} tone="auto" />}
            </p>
          </div>
          <ConfirmButton
            variant="primary"
            message={
              unpaid.length > 0
                ? `${unpaid.length} dues are still pending. Close anyway?`
                : undefined
            }
            onConfirm={closeMonth.bind(null, month)}
          >
            <CheckCircle2 className="h-4 w-4" />
            {existing ? "Re-close month" : "Close month"}
          </ConfirmButton>
        </CardBody>
      </Card>

      {/* History */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted">Snapshot history</h2>
        {snaps.length === 0 ? (
          <EmptyState title="No snapshots yet" hint="Close a month to start your history." />
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {[...snaps].reverse().map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium">{monthLabel(s.month)}</span>
                    <div className="text-xs text-muted">
                      assets <Money paise={s.totalAssetsPaise} compact /> · liabilities{" "}
                      <Money paise={s.totalLiabilitiesPaise} compact />
                    </div>
                  </div>
                  <Money paise={s.netWorthPaise} tone="auto" className="font-semibold" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({
  ok,
  okText,
  warnText,
  href,
  action,
}: {
  ok: boolean;
  okText: string;
  warnText: string;
  href: string;
  action: string;
}) {
  return (
    <Card className={ok ? "" : "border-warning/30 bg-warning/5"}>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          {ok ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-warning" />
          )}
          <span className="text-sm">{ok ? okText : warnText}</span>
        </div>
        {!ok && (
          <Link href={href}>
            <Button variant="outline" size="sm">
              {action}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

function isStale(d: Date | null): boolean {
  if (!d) return true;
  return (Date.now() - new Date(d).getTime()) / 86400000 > STALE_DAYS;
}
