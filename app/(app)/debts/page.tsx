import { PageHeader, Money } from "@/components/money";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { AccountFormFields } from "@/components/accounts/account-form";
import { AccountActions } from "@/components/accounts/account-actions";
import { RecordPayment } from "@/components/debts/debt-actions";
import { createAccount } from "@/app/actions";
import { getActiveAccounts } from "@/lib/queries";
import { Plus } from "lucide-react";
import type { Account } from "@/lib/db/schema";

export default async function DebtsPage() {
  const accs = await getActiveAccounts();
  const owedToMe = accs.filter((a) => a.type === "friend_debt_owed_to_me");
  const iOwe = accs.filter((a) => a.type === "friend_debt_i_owe");

  const totalOwedToMe = owedToMe.reduce((s, a) => s + a.balancePaise, 0);
  const totalIOwe = iOwe.reduce((s, a) => s + a.balancePaise, 0);
  const net = totalOwedToMe - totalIOwe;

  return (
    <div className="animate-fadeup space-y-5">
      <PageHeader
        title="Friend Debts"
        subtitle="Money between you and friends — track it like everything else."
        action={
          <FormDialog
            title="Add a friend debt"
            action={createAccount}
            submitLabel="Add debt"
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Add debt
              </Button>
            }
          >
            <AccountFormFields />
          </FormDialog>
        }
      />

      {/* Net position */}
      <Card className={net >= 0 ? "border-primary/20 bg-primary/5" : "border-danger/20 bg-danger/5"}>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted">Net position</p>
            <Money paise={net} tone="auto" className="text-2xl font-semibold" />
          </div>
          <div className="text-right text-xs text-muted">
            <div>
              owed to you <Money paise={totalOwedToMe} tone="primary" />
            </div>
            <div>
              you owe <Money paise={totalIOwe} tone="danger" />
            </div>
          </div>
        </div>
      </Card>

      {owedToMe.length === 0 && iOwe.length === 0 ? (
        <EmptyState
          title="No friend debts tracked"
          hint="Lent money to someone, or borrowed? Add it and mark it settled as it’s paid back."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <DebtGroup title="Owed to me" accounts={owedToMe} positive />
          <DebtGroup title="I owe" accounts={iOwe} />
        </div>
      )}
    </div>
  );
}

function DebtGroup({
  title,
  accounts,
  positive = false,
}: {
  title: string;
  accounts: Account[];
  positive?: boolean;
}) {
  if (accounts.length === 0)
    return (
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted">{title}</h2>
        <EmptyState title={`Nothing ${positive ? "owed to you" : "you owe"}`} />
      </div>
    );
  return (
    <div>
      <h2 className="mb-2 text-sm font-medium text-muted">{title}</h2>
      <Card>
        <div className="divide-y divide-border">
          {accounts.map((a) => {
            const settled = a.balancePaise <= 0;
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <span className="truncate font-medium">{a.counterparty || a.name}</span>
                  <div className="mt-0.5 text-xs text-muted">{a.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Money
                    paise={a.balancePaise}
                    tone={settled ? "muted" : positive ? "primary" : "danger"}
                    className="font-semibold"
                  />
                  {!settled && <RecordPayment account={a} />}
                  <AccountActions account={a} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
