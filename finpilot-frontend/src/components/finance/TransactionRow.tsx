import { categoryIcon } from '../../lib/categoryMeta';
import { formatDate, formatSigned } from '../../lib/format';
type RowTx = {
  id: number;
  categoryName: string;
  transactionType: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string | null;
  transactionDate: string;
};

export default function TransactionRow({
  tx,
  onClick,
  accountName,
}: {
  tx: RowTx;
  onClick?: () => void;
  accountName?: string;
}) {
  const Icon = categoryIcon(tx.categoryName);
  const income = tx.transactionType === 'INCOME';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors duration-150 hover:bg-canvas"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-muted">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{tx.description || tx.categoryName}</span>
        <span className="block truncate text-xs text-muted">
          {tx.categoryName}
          {accountName ? ` · ${accountName}` : ''} · {formatDate(tx.transactionDate)}
        </span>
      </span>
      <span className={`font-mono text-sm font-medium ${income ? 'text-positive-dark' : 'text-ink'}`}>
        {formatSigned(tx.amount, tx.transactionType)}
      </span>
    </button>
  );
}
