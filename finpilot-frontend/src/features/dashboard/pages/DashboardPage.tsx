import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboard, getTrends } from '../api/dashboardApi';
import { listAccounts } from '../../accounts/api/accountsApi';
import { getInsights, getNarrative } from '../../insights/api/insightsApi';
import { listBudgets } from '../../budgets/api/budgetsApi';
import { formatCurrency, greeting, monthName, percent } from '../../../lib/format';
import { currentMonthIso } from '../../../lib/format';
import { useUiStore } from '../../../store/uiStore';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/layout/PageHeader';
import Surface from '../../../components/ui/Surface';
import { PageSkeleton } from '../../../components/ui/Skeleton';
import FinancialMetric from '../../../components/finance/FinancialMetric';
import CashFlowChart from '../../../components/finance/CashFlowChart';
import SpendingBreakdown from '../../../components/finance/SpendingBreakdown';
import BudgetProgress from '../../../components/finance/BudgetProgress';
import TransactionRow from '../../../components/finance/TransactionRow';
import EmptyState from '../../../components/ui/EmptyState';
import { isAxiosError } from 'axios';

export default function DashboardPage() {
  const setQuickAdd = useUiStore((s) => s.setQuickAdd);
  const setSelected = useUiStore((s) => s.setSelectedTransactionId);
  const month = currentMonthIso();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(),
  });
  const { data: trends = [] } = useQuery({
    queryKey: ['trends', 12],
    queryFn: () => getTrends(12),
  });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', month],
    queryFn: () => listBudgets(month),
  });
  const { data: insights = [] } = useQuery({
    queryKey: ['insights'],
    queryFn: () => getInsights(),
  });
  const { data: narrative, error: narrativeError } = useQuery({
    queryKey: ['narrative'],
    queryFn: () => getNarrative(),
    retry: false,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return <p className="text-sm text-negative">Couldn't load your dashboard. Please try again.</p>;
  }

  const cash = accounts
    .filter((a) => a.accountType !== 'CREDIT_CARD')
    .reduce((sum, a) => sum + a.balance, 0);
  const savingsRate = data.monthlyIncome > 0 ? (data.netSavings / data.monthlyIncome) * 100 : null;
  const primaryInsight = insights[0];
  const narrativeUnavailable = isAxiosError(narrativeError) && narrativeError.response?.status === 503;

  return (
    <div>
      <PageHeader
        title={greeting()}
        subtitle={`Here's your financial picture for ${monthName()}.`}
        actions={
          <Button onClick={() => setQuickAdd(true, 'transaction')}>+ Add transaction</Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <FinancialMetric label="Net worth" value={formatCurrency(data.totalBalance)} />
        <FinancialMetric label="Available cash" value={formatCurrency(cash)} hint="Excludes credit cards" />
        <FinancialMetric label="Income" value={formatCurrency(data.monthlyIncome)} tone="positive" hint="This month" />
        <FinancialMetric label="Expenses" value={formatCurrency(data.monthlyExpense)} tone="negative" hint="This month" />
        <FinancialMetric
          label="Savings rate"
          value={savingsRate === null ? '—' : percent(savingsRate)}
          tone={savingsRate !== null && savingsRate >= 0 ? 'positive' : 'negative'}
          hint={savingsRate === null ? 'Needs income this month' : 'Of this month’s income'}
        />
      </div>

      <Surface className="mt-6 p-6 sm:p-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-ink">Cash flow</h2>
            <p className="mt-1 text-[13px] text-muted">Income, expenses, and net movement over the last 12 months.</p>
          </div>
        </div>
        <CashFlowChart trends={trends} />
      </Surface>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Surface className="p-6">
          <h2 className="text-sm font-medium">Spending breakdown</h2>
          <p className="mb-5 mt-1 text-[13px] text-muted">By category — this month</p>
          <SpendingBreakdown items={data.expenseByCategory} />
        </Surface>

        <Surface className="p-6">
          <h2 className="text-sm font-medium">Budget health</h2>
          <p className="mb-5 mt-1 text-[13px] text-muted">{monthName()} spending plan</p>
          {budgets.length === 0 ? (
            <EmptyState
              title="No budgets this month"
              body="Set category limits and FinPilot will show how this month is tracking."
              action="Create budget"
              onAction={() => setQuickAdd(true, 'budget')}
            />
          ) : (
            <div className="space-y-5">
              {budgets.slice(0, 5).map((budget) => (
                <BudgetProgress key={budget.id} {...budget} />
              ))}
            </div>
          )}
        </Surface>

        <Surface className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium">Recent activity</h2>
              <p className="mt-1 text-[13px] text-muted">Latest movements across accounts</p>
            </div>
            <Link to="/transactions" className="text-[13px] text-muted transition-colors hover:text-ink">
              View all
            </Link>
          </div>
          {data.recentTransactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              body="Once you add your first transaction, FinPilot will start understanding your spending patterns."
              action="Add transaction"
              onAction={() => setQuickAdd(true, 'transaction')}
            />
          ) : (
            <div>
              {data.recentTransactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onClick={() => setSelected(tx.id)} />
              ))}
            </div>
          )}
        </Surface>

        <Surface className="p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">FinPilot Intelligence</p>
          {primaryInsight ? (
            <>
              <p className="mt-3 text-[17px] font-medium leading-snug tracking-tight">{primaryInsight.message}</p>
              {narrative && !narrativeUnavailable && (
                <p className="mt-3 text-sm leading-relaxed text-muted">{narrative.narrative}</p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/transactions"
                  className="rounded-[12px] border border-line px-3 py-2 text-[13px] font-medium hover:bg-canvas"
                >
                  View transactions
                </Link>
                <Link
                  to="/insights"
                  className="rounded-[12px] bg-ink px-3 py-2 text-[13px] font-medium text-white hover:bg-ink/90"
                >
                  Explain
                </Link>
              </div>
            </>
          ) : (
            <EmptyState
              title="Intelligence is quiet"
              body="When spending shifts, budgets tighten, or savings improve, that context will land here — grounded in your ledger."
            />
          )}
        </Surface>
      </div>
    </div>
  );
}
