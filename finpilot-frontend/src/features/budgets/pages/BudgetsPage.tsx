import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { listBudgets, setBudget, type BudgetStatus } from '../api/budgetsApi';
import { listCategories } from '../../accounts/api/categoriesApi';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function currentMonthIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

const STATUS_STYLES: Record<BudgetStatus, string> = {
  ON_TRACK: 'bg-emerald-100 text-emerald-700',
  WARNING: 'bg-amber-100 text-amber-700',
  EXCEEDED: 'bg-red-100 text-red-700',
};

const BAR_STYLES: Record<BudgetStatus, string> = {
  ON_TRACK: 'bg-emerald-500',
  WARNING: 'bg-amber-500',
  EXCEEDED: 'bg-red-500',
};

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const month = currentMonthIso();

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', month],
    queryFn: () => listBudgets(month),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  // Budgets can only be set on EXPENSE categories - the backend rejects
  // INCOME categories with InvalidBudgetException, so filter them out here
  // rather than let the user hit that error after submitting.
  const expenseCategories = (categories ?? []).filter((c) => c.categoryType === 'EXPENSE');

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  const setBudgetMutation = useMutation({
    mutationFn: setBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAmount('');
      setCategoryId('');
    },
  });

  function errorMessage(): string | null {
    const err = setBudgetMutation.error;
    if (!err || !isAxiosError(err)) return null;
    return err.response?.data?.message ?? 'Something went wrong. Please try again.';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categoryId) return;
    setBudgetMutation.mutate({
      categoryId: Number(categoryId),
      periodMonth: month,
      amount: Number(amount),
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Budgets</h1>
        <p className="text-sm text-slate-500 mt-1">Set monthly limits per category and track how you're doing</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Set a budget for this month</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="" disabled>Select category</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Monthly limit</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={setBudgetMutation.isPending}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {setBudgetMutation.isPending ? 'Saving...' : 'Save budget'}
          </button>

          {setBudgetMutation.isError && (
            <p className="sm:col-span-3 text-sm text-red-600">{errorMessage()}</p>
          )}
        </form>
        <p className="text-xs text-slate-400 mt-3">
          Setting a budget for a category that already has one this month updates it, rather than creating a duplicate.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">This month's budgets</h2>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : !budgets || budgets.length === 0 ? (
          <p className="text-sm text-slate-400">No budgets set yet - add one above.</p>
        ) : (
          <div className="space-y-5">
            {budgets.map((budget) => (
              <div key={budget.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-slate-800">{budget.categoryName}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[budget.status]}`}>
                    {budget.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${BAR_STYLES[budget.status]}`}
                    style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {formatCurrency(budget.spentAmount)} of {formatCurrency(budget.budgetedAmount)} spent
                  {' · '}
                  {formatCurrency(budget.remainingAmount)} remaining
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
