import { useQuery } from '@tanstack/react-query';
import { listBudgets } from '../api/budgetsApi';
import { currentMonthIso, formatCurrency, monthName, percent } from '../../../lib/format';
import { useUiStore } from '../../../store/uiStore';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/layout/PageHeader';
import Surface from '../../../components/ui/Surface';
import Skeleton from '../../../components/ui/Skeleton';
import BudgetProgress from '../../../components/finance/BudgetProgress';
import BudgetForm from '../components/BudgetForm';

export default function BudgetsPage() {
  const setQuickAdd = useUiStore((s) => s.setQuickAdd);
  const month = currentMonthIso();
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', month],
    queryFn: () => listBudgets(month),
  });

  const spent = (budgets ?? []).reduce((sum, b) => sum + b.spentAmount, 0);
  const planned = (budgets ?? []).reduce((sum, b) => sum + b.budgetedAmount, 0);
  const remaining = planned - spent;
  const used = planned > 0 ? (spent / planned) * 100 : 0;
  const warnings = (budgets ?? []).filter((b) => b.status !== 'ON_TRACK');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        subtitle={`${monthName()} spending plan — limits that stay honest.`}
        actions={<Button onClick={() => setQuickAdd(true, 'budget')}>Create budget</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Surface className="px-5 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Spent</p>
          <p className="mt-2 font-mono text-[28px] font-semibold">{formatCurrency(spent)}</p>
        </Surface>
        <Surface className="px-5 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Remaining</p>
          <p className={`mt-2 font-mono text-[28px] font-semibold ${remaining < 0 ? 'text-negative' : 'text-ink'}`}>
            {formatCurrency(remaining)}
          </p>
        </Surface>
        <Surface className="px-5 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Plan used</p>
          <p className="mt-2 font-mono text-[28px] font-semibold">{planned === 0 ? '—' : percent(used)}</p>
        </Surface>
      </div>

      {warnings.length > 0 && (
        <Surface className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Worth noticing</p>
          <div className="mt-3 space-y-2">
            {warnings.map((budget) => (
              <p key={budget.id} className="text-sm leading-relaxed">
                {budget.status === 'EXCEEDED'
                  ? `${budget.categoryName} is over its monthly limit.`
                  : `${budget.categoryName} is approaching your monthly limit.`}
              </p>
            ))}
          </div>
        </Surface>
      )}

      <Surface className="p-6">
        <h2 className="mb-5 text-sm font-medium">This month’s budgets</h2>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !budgets || budgets.length === 0 ? (
          <EmptyState
            title="No budgets set yet"
            body="Give important categories a monthly limit. FinPilot will track spend against the plan — not against a guess."
            action="Create budget"
            onAction={() => setQuickAdd(true, 'budget')}
          />
        ) : (
          <div className="space-y-6">
            {budgets.map((budget) => (
              <BudgetProgress key={budget.id} {...budget} />
            ))}
          </div>
        )}
      </Surface>

      <Surface className="p-6">
        <h2 className="mb-1 text-sm font-medium">Set a budget</h2>
        <p className="mb-4 text-[13px] text-muted">
          Setting a budget for a category that already has one this month updates it.
        </p>
        <BudgetForm />
      </Surface>
    </div>
  );
}
