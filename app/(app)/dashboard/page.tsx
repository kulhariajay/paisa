import { PageHeader, Money } from "@/components/money";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import {
  NetWorthChart,
  IncomeExpenseChart,
  CategoryDonut,
  DebtBar,
  InvestmentBar,
} from "@/components/charts";
import { getDashboardData } from "@/lib/dashboard";
import { getActiveAccounts } from "@/lib/queries";
import { monthLabel, currentMonth } from "@/lib/utils";
import {
  TrendingUp,
  CalendarClock,
  Landmark,
  PiggyBank,
  PartyPopper,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const accs = await getActiveAccounts();
  if (accs.length === 0) {
    return (
      <div className="animate-fadeup">
        <PageHeader title="Dashboard" subtitle={monthLabel(currentMonth())} />
        <EmptyState
          title="Let’s set up your money"
          hint="Add your bank balance, loans, investments and recurring items. Everything on this dashboard fills in from there."
        >
          <Link href="/accounts">
            <Button>Add your first account</Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  const d = await getDashboardData();
  const monthsToFree = d.debtFreeMonth ? monthsFromNow(d.debtFreeMonth) : null;

  return (
    <div className="animate-fadeup space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`${monthLabel(currentMonth())} · your money at a glance`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label="Net Worth"
          tone="primary"
        >
          <Money paise={d.netWorth.netWorthPaise} tone="auto" className="text-2xl font-semibold" />
        </Stat>
        <Stat
          icon={<CalendarClock className="h-4 w-4" />}
          label="Due this month"
          tone="warning"
          href="/dues"
        >
          <div className="text-2xl font-semibold tnum">
            <Money paise={d.pendingTotalPaise} />
          </div>
          <p className="mt-0.5 text-xs text-muted">{d.pendingCount} pending</p>
        </Stat>
        <Stat
          icon={<PiggyBank className="h-4 w-4" />}
          label="Investments"
          tone="info"
          href="/investments"
        >
          <Money
            paise={d.netWorth.investmentsValuePaise}
            tone="info"
            className="text-2xl font-semibold"
          />
        </Stat>
        <Stat
          icon={<Landmark className="h-4 w-4" />}
          label="Total Debt"
          tone="danger"
          href="/accounts"
        >
          <Money paise={d.totalDebtPaise} tone="danger" className="text-2xl font-semibold" />
        </Stat>
      </div>

      {/* Debt-free day */}
      {d.debtFreeMonth && (
        <Card className="border-primary/20 bg-primary/5">
          <CardBody className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted">Debt-Free Day</p>
              <p className="text-lg font-semibold">
                {monthLabel(d.debtFreeMonth)}
                {monthsToFree != null && (
                  <span className="ml-2 text-sm font-normal text-muted">
                    {monthsToFree} {monthsToFree === 1 ? "month" : "months"} to go
                  </span>
                )}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Net worth trend */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Net worth over time</CardTitle>
          <Badge tone="muted">{d.netWorthSeries.length} points</Badge>
        </CardHeader>
        <CardBody>
          <NetWorthChart data={d.netWorthSeries} />
          {d.netWorthSeries.length <= 1 && (
            <p className="mt-2 text-center text-xs text-muted">
              Close a month to start building your history line.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Income/expense + category */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income vs expense (6 months)</CardTitle>
          </CardHeader>
          <CardBody>
            <IncomeExpenseChart data={d.incomeExpense} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This month’s spending</CardTitle>
          </CardHeader>
          <CardBody>
            <CategoryDonut data={d.categoryBreakdown} />
          </CardBody>
        </Card>
      </div>

      {/* Debt + investments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Debt by account</CardTitle>
          </CardHeader>
          <CardBody>
            <DebtBar data={d.debtBreakdown} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Investments: value vs invested</CardTitle>
          </CardHeader>
          <CardBody>
            <InvestmentBar data={d.investments} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  tone,
  href,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "primary" | "danger" | "warning" | "info";
  href?: string;
  children: React.ReactNode;
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    danger: "text-danger bg-danger/10",
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10",
  }[tone];

  const inner = (
    <Card className="h-full transition-colors hover:border-border/80">
      <CardBody>
        <div className="mb-2 flex items-center gap-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClass}`}>
            {icon}
          </span>
          <span className="text-xs font-medium text-muted">{label}</span>
        </div>
        {children}
      </CardBody>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function monthsFromNow(month: string): number {
  const now = currentMonth();
  const [ny, nm] = now.split("-").map(Number);
  const [my, mm] = month.split("-").map(Number);
  return (my - ny) * 12 + (mm - nm);
}
