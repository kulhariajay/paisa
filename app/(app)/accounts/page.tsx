import { PageHeader, Money } from "@/components/money";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { FormDialog } from "@/components/ui/dialog";
import { AccountFormFields } from "@/components/accounts/account-form";
import { TemplateFormFields } from "@/components/accounts/template-form";
import { AccountActions } from "@/components/accounts/account-actions";
import { TemplateActions } from "@/components/accounts/template-actions";
import { createAccount, createTemplate } from "@/app/actions";
import {
  getActiveAccounts,
  getCategories,
  getTemplatesWithAccount,
} from "@/lib/queries";
import { isAsset } from "@/lib/finance";
import { Plus } from "lucide-react";
import type { Account } from "@/lib/db/schema";

const TYPE_LABEL: Record<Account["type"], string> = {
  cash_bank: "Cash / Bank",
  investment: "Investment",
  bank_loan: "Loan",
  credit_card: "Credit Card",
  friend_debt_owed_to_me: "Owed to me",
  friend_debt_i_owe: "I owe",
};

export default async function AccountsPage() {
  const [accs, categories, templates] = await Promise.all([
    getActiveAccounts(),
    getCategories(),
    getTemplatesWithAccount(),
  ]);

  const assets = accs.filter((a) => isAsset(a.type));
  const liabilities = accs.filter((a) => !isAsset(a.type));

  return (
    <div className="animate-fadeup">
      <PageHeader
        title="Accounts"
        subtitle="Everything you own and owe, plus your recurring monthly items."
        action={
          <FormDialog
            title="Add account"
            description="Cash, investment, loan, card, or a friend debt."
            action={createAccount}
            submitLabel="Add account"
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Add account
              </Button>
            }
          >
            <AccountFormFields />
          </FormDialog>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AccountGroup title="Assets" accounts={assets} positive />
        <AccountGroup title="Liabilities" accounts={liabilities} />
      </div>

      {/* Recurring templates */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recurring items</h2>
          <FormDialog
            title="Add recurring item"
            description="EMIs, salary, rent, SIPs and bills appear automatically each month."
            action={createTemplate}
            submitLabel="Add recurring"
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" /> Add recurring
              </Button>
            }
          >
            <TemplateFormFields accounts={accs} categories={categories} />
          </FormDialog>
        </div>

        {templates.length === 0 ? (
          <EmptyState
            title="No recurring items yet"
            hint="Add your salary, EMIs and rent so they show up on the Dues board every month."
          />
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{t.name}</span>
                      {!t.active && <Badge>paused</Badge>}
                      {t.amountIsEstimate && <Badge tone="warning">varies</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {t.kind} · day {t.dayOfMonth}
                      {t.accountName ? ` · ${t.accountName}` : ""}
                      {t.categoryName ? ` · ${t.categoryName}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money
                      paise={t.amountPaise}
                      tone={t.kind === "income" ? "primary" : "none"}
                      className="font-medium"
                    />
                    <TemplateActions id={t.id} active={t.active} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function AccountGroup({
  title,
  accounts,
  positive = false,
}: {
  title: string;
  accounts: Account[];
  positive?: boolean;
}) {
  const total = accounts.reduce((s, a) => s + a.balancePaise, 0);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">{title}</h2>
        <Money paise={total} tone={positive ? "primary" : "danger"} className="text-sm font-medium" />
      </div>
      {accounts.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} yet`} />
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{a.name}</span>
                    <Badge>{TYPE_LABEL[a.type]}</Badge>
                  </div>
                  {a.type === "bank_loan" && a.tenureMonthsLeft != null && (
                    <div className="mt-0.5 text-xs text-muted">
                      {a.tenureMonthsLeft} EMIs left
                    </div>
                  )}
                  {a.counterparty && (
                    <div className="mt-0.5 text-xs text-muted">{a.counterparty}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Money
                    paise={a.balancePaise}
                    tone={positive ? "primary" : "danger"}
                    className="font-semibold"
                  />
                  <AccountActions account={a} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
