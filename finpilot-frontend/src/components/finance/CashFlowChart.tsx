import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyTrend } from '../../features/dashboard/api/dashboardApi';
import { formatCurrency, formatMonthShort, formatSigned } from '../../lib/format';
import EmptyState from '../ui/EmptyState';

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const income = Number(payload.find((p) => p.dataKey === 'income')?.value ?? 0);
  const expense = Number(payload.find((p) => p.dataKey === 'expense')?.value ?? 0);
  const net = Number(payload.find((p) => p.dataKey === 'net')?.value ?? income - expense);
  return (
    <div className="min-w-[180px] rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_32px_rgba(17,19,21,0.08)]">
      <p className="text-sm font-medium text-ink">{label}</p>
      <dl className="mt-2 space-y-1 text-[13px]">
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Income</dt>
          <dd className="font-mono text-positive-dark">{formatCurrency(income)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Expenses</dt>
          <dd className="font-mono text-negative">{formatCurrency(expense)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Net</dt>
          <dd className={`font-mono ${net >= 0 ? 'text-positive-dark' : 'text-negative'}`}>{formatSigned(net)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function CashFlowChart({ trends }: { trends: MonthlyTrend[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const empty = trends.every((t) => t.income === 0 && t.expense === 0);
  if (empty) {
    return (
      <EmptyState
        title="Not enough history yet"
        body="Add a few months of transactions and this chart will show income, expenses, and net cash flow."
      />
    );
  }

  const data = trends.map((t) => ({
    ...t,
    label: formatMonthShort(t.periodMonth),
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-4 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-positive" /> Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-negative" /> Expenses
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-positive-dark" /> Cashflow
        </span>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            onMouseMove={(state) => {
              const next = state?.activeLabel;
              if (typeof next === 'string') setHover(next);
            }}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#79C84A" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#79C84A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E8E9E6" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#737A76', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: '#737A76', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              width={36}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#111315', strokeWidth: 1, strokeOpacity: 0.12 }} />
            <Area type="monotone" dataKey="income" stroke="none" fill="url(#incomeFill)" />
            <Line type="monotone" dataKey="income" stroke="#79C84A" strokeWidth={1.75} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="expense" stroke="#E85C5C" strokeWidth={1.75} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="net" stroke="#4D9D2B" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {hover && <p className="sr-only">Viewing {hover}</p>}
    </div>
  );
}
