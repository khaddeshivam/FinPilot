import { useQuery } from '@tanstack/react-query';
import { getDashboard, getTrends } from '../../dashboard/api/dashboardApi';
import { formatCurrency } from '../../../lib/format';
import CashFlowChart from '../../../components/finance/CashFlowChart';
import PageHeader from '../../../components/layout/PageHeader';
import SpendingBreakdown from '../../../components/finance/SpendingBreakdown';
import Surface from '../../../components/ui/Surface';
import { PageSkeleton } from '../../../components/ui/Skeleton';

export default function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard() });
  const { data: trends = [] } = useQuery({ queryKey: ['trends', 12], queryFn: () => getTrends(12) });

  if (isLoading || !data) {
    return isLoading ? <PageSkeleton /> : <p className="text-sm text-muted">Couldn't load reports.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="A quieter look at cash flow and where spending concentrated this month."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Surface className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Income</p>
          <p className="mt-2 font-mono text-[26px] font-semibold">{formatCurrency(data.monthlyIncome)}</p>
        </Surface>
        <Surface className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Expenses</p>
          <p className="mt-2 font-mono text-[26px] font-semibold">{formatCurrency(data.monthlyExpense)}</p>
        </Surface>
        <Surface className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Net</p>
          <p className="mt-2 font-mono text-[26px] font-semibold">{formatCurrency(data.netSavings)}</p>
        </Surface>
      </div>
      <Surface className="p-6 sm:p-8">
        <h2 className="mb-6 text-sm font-medium">Last 12 months</h2>
        <CashFlowChart trends={trends} />
      </Surface>
      <Surface className="p-6">
        <h2 className="mb-1 text-sm font-medium">Spending this month</h2>
        <p className="mb-5 text-[13px] text-muted">Category mix from your ledger — not a decorative chart.</p>
        <SpendingBreakdown items={data.expenseByCategory} />
      </Surface>
    </div>
  );
}
