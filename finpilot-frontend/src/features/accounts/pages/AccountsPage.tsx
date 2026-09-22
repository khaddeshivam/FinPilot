import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAccounts, type AccountType } from '../api/accountsApi';
import { accountGroup, accountIcon } from '../../../lib/categoryMeta';
import { formatCurrency } from '../../../lib/format';
import { useUiStore } from '../../../store/uiStore';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/layout/PageHeader';
import Surface from '../../../components/ui/Surface';
import Skeleton from '../../../components/ui/Skeleton';
import AccountForm from '../components/AccountForm';

const GROUP_ORDER = ['Cash', 'Credit', 'Wallets'];

export default function AccountsPage() {
  const setQuickAdd = useUiStore((s) => s.setQuickAdd);
  const { data: accounts, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });

  const total = (accounts ?? []).reduce((sum, a) => sum + a.balance, 0);
  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof accounts>>();
    for (const account of accounts ?? []) {
      const group = accountGroup(account.accountType);
      const list = map.get(group) ?? [];
      list.push(account);
      map.set(group, list);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [accounts]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        subtitle="Cash, cards, and wallets in one place."
        actions={<Button onClick={() => setQuickAdd(true, 'account')}>Add account</Button>}
      />

      <Surface className="px-6 py-7">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Total balance</p>
        {isLoading ? (
          <Skeleton className="mt-3 h-10 w-48" />
        ) : (
          <p className="mt-2 font-mono text-[36px] font-semibold tracking-tight">{formatCurrency(total)}</p>
        )}
      </Surface>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <Surface className="p-6">
          <EmptyState
            title="No accounts yet"
            body="Add a bank account, cash, card, or wallet so FinPilot can keep a true picture of your money."
            action="Add account"
            onAction={() => setQuickAdd(true, 'account')}
          />
        </Surface>
      ) : (
        grouped.map(([group, items]) => (
          <Surface key={group} className="p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-medium">{group}</h2>
            <div className="divide-y divide-line">
              {items.map((account) => {
                const Icon = accountIcon(account.accountType as AccountType);
                return (
                  <div key={account.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-canvas text-muted">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-muted">{account.accountType.replace('_', ' ')}</p>
                    </div>
                    <p className={`font-mono text-sm font-semibold ${account.balance < 0 ? 'text-negative' : 'text-ink'}`}>
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Surface>
        ))
      )}

      <Surface className="p-6">
        <h2 className="mb-4 text-sm font-medium">Add an account</h2>
        <AccountForm />
      </Surface>
    </div>
  );
}
