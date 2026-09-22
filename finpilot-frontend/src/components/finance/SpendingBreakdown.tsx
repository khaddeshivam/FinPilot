import { categoryIcon } from '../../lib/categoryMeta';
import { formatCurrency, percent } from '../../lib/format';
import Progress from '../ui/Progress';
import EmptyState from '../ui/EmptyState';

export default function SpendingBreakdown({
  items,
}: {
  items: { categoryName: string; amount: number }[];
}) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  if (items.length === 0) {
    return (
      <EmptyState
        title="No spending yet"
        body="Once expenses land this month, FinPilot will show how they break down by category."
      />
    );
  }

  return (
    <div className="space-y-5">
      {items.map((item) => {
        const Icon = categoryIcon(item.categoryName);
        const share = total > 0 ? (item.amount / total) * 100 : 0;
        return (
          <div key={item.categoryName}>
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-negative/10 text-negative">
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">{item.categoryName}</p>
                  <p className="font-mono text-sm font-medium">{formatCurrency(item.amount)}</p>
                </div>
                <p className="text-xs text-muted">{percent(share)} of total</p>
              </div>
            </div>
            <Progress value={share} tone="negative" />
          </div>
        );
      })}
    </div>
  );
}
