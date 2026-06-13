import { PageHeader, Money } from "@/components/money";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { AccountActions } from "@/components/accounts/account-actions";
import { InvestmentBar } from "@/components/charts";
import { AccountFormFields } from "@/components/accounts/account-form";
import { createAccount } from "@/app/actions";
import { getActiveAccounts } from "@/lib/queries";
import { toRupees } from "@/lib/paise";
import { Plus, AlertTriangle } from "lucide-react";

const STALE_DAYS = 30;

export default async function InvestmentsPage() {
  const accs = await getActiveAccounts();
  const investments = accs.filter((a) => a.type === "investment");

  const totalValue = investments.reduce((s, a) => s + a.balancePaise, 0);
  const totalInvested = investments.reduce((s, a) => s + a.investedPaise, 0);
  const gain = totalValue - totalInvested;

  const chartData = investments.map((a) => ({
    name: a.name,
    invested: toRupees(a.investedPaise),
    value: toRupees(a.balancePaise),
  }));

  return (
    <div className="animate-fadeup space-y-5">
      <PageHeader
        title="Investments"
        subtitle="Update values when you check them. We keep the history for your growth chart."
        action={
          <FormDialog
            title="Add investment"
            action={createAccount}
            submitLabel="Add investment"
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Add investment
              </Button>
            }
          >
            <AccountFormFields />
          </FormDialog>
        }
      />

      {investments.length === 0 ? (
        <EmptyState
          title="No investments yet"
          hint="Add mutual funds, stocks, FDs or anything you hold. Update the value whenever you like."
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <div className="p-4">
                <p className="text-xs text-muted">Current value</p>
                <Money paise={totalValue} tone="info" className="text-xl font-semibold" />
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-xs text-muted">Invested</p>
                <Money paise={totalInvested} className="text-xl font-semibold" />
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-xs text-muted">Gain / Loss</p>
                <Money paise={gain} tone="auto" className="text-xl font-semibold" />
                {totalInvested > 0 && (
                  <p className="mt-0.5 text-xs text-muted tnum">
                    {((gain / totalInvested) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="divide-y divide-border">
              {investments.map((a) => {
                const g = a.balancePaise - a.investedPaise;
                const stale = isStale(a.valuationUpdatedAt);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{a.name}</span>
                        {stale && (
                          <Badge tone="warning">
                            <AlertTriangle className="h-3 w-3" /> update value
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        invested <Money paise={a.investedPaise} compact /> ·{" "}
                        <span className={g >= 0 ? "text-primary" : "text-danger"}>
                          {g >= 0 ? "+" : ""}
                          <Money paise={g} compact />
                        </span>
                        {a.valuationUpdatedAt && (
                          <> · updated {a.valuationUpdatedAt.toLocaleDateString("en-IN")}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Money paise={a.balancePaise} tone="info" className="font-semibold" />
                      <AccountActions account={a} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Value vs invested</CardTitle>
            </CardHeader>
            <CardBody>
              <InvestmentBar data={chartData} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function isStale(d: Date | null): boolean {
  if (!d) return true;
  const days = (Date.now() - new Date(d).getTime()) / 86400000;
  return days > STALE_DAYS;
}
