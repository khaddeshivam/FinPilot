import type { BudgetStatus } from '../../features/budgets/api/budgetsApi';
import { formatCurrency, percent } from '../../lib/format';
import Badge from '../ui/Badge';
import Progress from '../ui/Progress';

function tone(status: BudgetStatus) {
  if (status === 'EXCEEDED') return 'negative' as const;
  if (status === 'WARNING') return 'warning' as const;
  return 'positive' as const;
}

function label(status: BudgetStatus) {
  if (status === 'ON_TRACK') return 'On track';
  if (status === 'WARNING') return 'Approaching limit';
  return 'Exceeded';
}

export default function BudgetProgress({
  categoryName,
  spentAmount,
  budgetedAmount,
  remainingAmount,
  percentUsed,
  status,
}: {
  categoryName: string;
  spentAmount: number;
  budgetedAmount: number;
  remainingAmount: number;
  percentUsed: number;
  status: BudgetStatus;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{categoryName}</p>
        <Badge tone={tone(status)}>{label(status)}</Badge>
      </div>
      <Progress value={percentUsed} tone={tone(status)} />
      <p className="mt-1.5 text-xs text-muted">
        {formatCurrency(spentAmount)} / {formatCurrency(budgetedAmount)}
        {' · '}
        {formatCurrency(remainingAmount)} remaining · {percent(percentUsed)}
      </p>
    </div>
  );
}
