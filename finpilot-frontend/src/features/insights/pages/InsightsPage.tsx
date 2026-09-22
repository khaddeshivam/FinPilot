import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getDashboard, getTrends } from '../../dashboard/api/dashboardApi';
import { getHealthScore, getInsights, getNarrative, type HealthLabel } from '../api/insightsApi';
import { formatCurrency, monthName, percent } from '../../../lib/format';
import InsightCard from '../../../components/finance/InsightCard';
import PageHeader from '../../../components/layout/PageHeader';
import Surface from '../../../components/ui/Surface';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { Link } from 'react-router-dom';

const LABEL_TEXT: Record<HealthLabel, string> = {
  EXCELLENT: 'Excellent',
  GOOD: 'Healthy',
  FAIR: 'Fair',
  NEEDS_ATTENTION: 'Needs attention',
};

export default function InsightsPage() {
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => getInsights(),
  });
  const { data: healthScore, isLoading: healthLoading } = useQuery({
    queryKey: ['healthScore'],
    queryFn: () => getHealthScore(),
  });
  const { data: narrative, isLoading: narrativeLoading, error: narrativeError } = useQuery({
    queryKey: ['narrative'],
    queryFn: () => getNarrative(),
    retry: false,
  });
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard() });
  const { data: trends = [] } = useQuery({ queryKey: ['trends', 6], queryFn: () => getTrends(6) });

  const narrativeNotConfigured = isAxiosError(narrativeError) && narrativeError.response?.status === 503;

  const expenses = trends.map((t) => t.expense);
  const mean = expenses.length ? expenses.reduce((a, b) => a + b, 0) / expenses.length : 0;
  const variance =
    expenses.length > 1
      ? expenses.reduce((sum, v) => sum + (v - mean) ** 2, 0) / expenses.length
      : 0;
  const consistency = mean > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / mean) * 100) : null;
  const runway =
    dashboard && dashboard.monthlyExpense > 0 ? dashboard.totalBalance / dashboard.monthlyExpense : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle={`What changed in ${monthName()}, and why it matters.`}
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Surface className="flex flex-col items-start p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Financial health</p>
          {healthLoading ? (
            <Skeleton className="mt-4 h-24 w-24 rounded-full" />
          ) : healthScore ? (
            <>
              <p className="mt-4 font-mono text-[56px] font-semibold leading-none tracking-tight">{healthScore.score}</p>
              <p className="mt-3 text-sm font-medium">{LABEL_TEXT[healthScore.label]}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Built from savings rate and how closely spending follows your budgets this month.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">Couldn't load your health score.</p>
          )}
        </Surface>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            label="Savings rate"
            value={healthScore ? percent(healthScore.savingsRate) : '—'}
          />
          <Metric
            label="Budget adherence"
            value={
              healthScore?.budgetAdherence == null ? 'No budgets' : percent(healthScore.budgetAdherence)
            }
          />
          <Metric
            label="Cash runway"
            value={runway == null ? '—' : `${runway.toFixed(1)} mo`}
            hint="Balance ÷ this month’s expenses"
          />
          <Metric
            label="Spending consistency"
            value={consistency == null ? '—' : percent(consistency)}
            hint="Stability of expenses over recent months"
          />
        </div>
      </div>

      <Surface className="p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">What changed</p>
        <div className="mt-4 space-y-3">
          {insightsLoading ? (
            <Skeleton className="h-20" />
          ) : !insights || insights.length === 0 ? (
            <EmptyState
              title="Nothing notable yet"
              body="When a category jumps, a budget tightens, or savings improve, it will be listed here."
            />
          ) : (
            insights.map((insight, index) => (
              <InsightCard key={`${insight.type}-${index}`} message={insight.message} severity={insight.severity} />
            ))
          )}
        </div>
      </Surface>

      <Surface className="p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">FinPilot explains</p>
        {narrativeLoading ? (
          <Skeleton className="mt-4 h-24" />
        ) : narrative ? (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">{narrative.narrative}</p>
        ) : narrativeNotConfigured ? (
          <p className="mt-3 text-sm text-muted">
            Written explanations need an OpenAI key on the server. Rule-based insights above still use your ledger.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">A written explanation couldn’t be generated right now.</p>
        )}
        {dashboard && (
          <p className="mt-4 text-[13px] text-muted">
            This month: {formatCurrency(dashboard.monthlyIncome)} in, {formatCurrency(dashboard.monthlyExpense)} out,
            net {formatCurrency(dashboard.netSavings)}.
          </p>
        )}
        <Link to="/ai" className="mt-5 inline-flex text-[13px] font-medium text-ink hover:underline">
          Ask a follow-up →
        </Link>
      </Surface>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Surface className="px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 font-mono text-[24px] font-semibold">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </Surface>
  );
}
