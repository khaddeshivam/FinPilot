import { useQuery } from '@tanstack/react-query';
import { getDashboard, getTrends } from '../api/dashboardApi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const CHART_COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

const STATUS_STYLES: Record<string, string> = {
  ON_TRACK: 'bg-emerald-100 text-emerald-700',
  WARNING: 'bg-amber-100 text-amber-700',
  EXCEEDED: 'bg-red-100 text-red-700',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: () => getTrends(6),
  });

  if (isLoading) {
    return <div className="p-8 text-slate-500">Loading dashboard...</div>;
  }

  if (isError || !data) {
    return <div className="p-8 text-red-600">Couldn't load your dashboard. Please try again.</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Balance" value={formatCurrency(data.totalBalance)} />
        <SummaryCard label="Income (this month)" value={formatCurrency(data.monthlyIncome)} tone="positive" />
        <SummaryCard label="Expenses (this month)" value={formatCurrency(data.monthlyExpense)} tone="negative" />
        <SummaryCard
          label="Net Savings"
          value={formatCurrency(data.netSavings)}
          tone={data.netSavings >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Income vs expense trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Income vs. expenses — last 6 months</h2>
        {trendsLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : !trends || trends.every((t) => t.income === 0 && t.expense === 0) ? (
          <p className="text-sm text-slate-400">Not enough history yet to show a trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends.map((t) => ({ ...t, month: t.periodMonth.slice(0, 7) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(value) => (value === undefined ? '' : formatCurrency(Number(value)))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expense" name="Expense" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budgets */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Budgets this month</h2>
          {data.budgets.length === 0 ? (
            <p className="text-sm text-slate-400">No budgets set for this month yet.</p>
          ) : (
            <div className="space-y-3">
              {data.budgets.map((budget) => (
                <div key={budget.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{budget.categoryName}</p>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(budget.spentAmount)} of {formatCurrency(budget.budgetedAmount)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[budget.status]}`}>
                    {budget.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense breakdown chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Spending by category</h2>
          {data.expenseByCategory.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses recorded yet this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.expenseByCategory}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {data.expenseByCategory.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => (value === undefined ? '' : formatCurrency(Number(value)))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Recent transactions</h2>
        {data.recentTransactions.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{tx.description || tx.categoryName}</p>
                  <p className="text-xs text-slate-400">{tx.categoryName} · {tx.transactionDate}</p>
                </div>
                <span className={`text-sm font-medium ${tx.transactionType === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {tx.transactionType === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-slate-900' : 'text-slate-900';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
