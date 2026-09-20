import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAccounts, createAccount, type AccountType } from '../api/accountsApi';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

const ACCOUNT_TYPES: AccountType[] = ['BANK', 'CASH', 'CREDIT_CARD', 'WALLET'];

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('BANK');
  const [openingBalance, setOpeningBalance] = useState('');

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      // Invalidate rather than manually splice the new account into cache -
      // simpler, and guarantees the list matches what the server actually
      // has (e.g. if balance formatting differs from what we sent).
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setName('');
      setOpeningBalance('');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name,
      accountType,
      openingBalance: openingBalance ? Number(openingBalance) : 0,
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">Your bank accounts, cash, cards, and wallets</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Add an account</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Savings"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>{type.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Opening balance</label>
            <input
              type="number"
              step="0.01"
              placeholder="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="sm:col-span-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add account'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Your accounts</h2>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : !accounts || accounts.length === 0 ? (
          <p className="text-sm text-slate-400">No accounts yet - add one above.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{account.name}</p>
                  <p className="text-xs text-slate-400">{account.accountType.replace('_', ' ')}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(account.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
