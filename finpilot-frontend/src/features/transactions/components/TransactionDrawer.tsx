import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAccounts } from '../../accounts/api/accountsApi';
import {
  deleteTransaction,
  listTransactions,
  type TransactionResponse,
} from '../api/transactionsApi';
import { categoryIcon } from '../../../lib/categoryMeta';
import { formatCurrency, formatDateLong, formatSigned } from '../../../lib/format';
import { useUiStore } from '../../../store/uiStore';
import Button from '../../../components/ui/Button';
import Drawer from '../../../components/ui/Drawer';
import TransactionForm from './TransactionForm';

function intelligence(tx: TransactionResponse, all: TransactionResponse[]): string | null {
  const peers = all.filter(
    (item) =>
      item.id !== tx.id &&
      item.categoryId === tx.categoryId &&
      item.transactionType === tx.transactionType,
  );
  if (peers.length < 2) return null;
  const avg = peers.reduce((sum, item) => sum + item.amount, 0) / peers.length;
  if (tx.transactionType === 'EXPENSE' && tx.amount > avg * 1.2) {
    return `This purchase is ${formatCurrency(tx.amount - avg)} higher than your typical ${tx.categoryName.toLowerCase()} spending.`;
  }
  if (tx.transactionType === 'EXPENSE' && tx.amount < avg * 0.7) {
    return `This is below your usual ${tx.categoryName.toLowerCase()} amount of about ${formatCurrency(avg)}.`;
  }
  if (tx.transactionType === 'INCOME' && tx.amount > avg * 1.1) {
    return `This income is above your typical ${tx.categoryName.toLowerCase()} inflow.`;
  }
  return `This sits close to your usual ${tx.categoryName.toLowerCase()} amount of about ${formatCurrency(avg)}.`;
}

export default function TransactionDrawer() {
  const selectedId = useUiStore((s) => s.selectedTransactionId);
  const setSelected = useUiStore((s) => s.setSelectedTransactionId);
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: listTransactions });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const tx = transactions.find((item) => item.id === selectedId);
  const account = accounts.find((item) => item.id === tx?.accountId);
  const Icon = tx ? categoryIcon(tx.categoryName) : null;

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['trends'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      setSelected(null);
      setEditing(false);
    },
  });

  return (
    <Drawer
      open={selectedId !== null}
      title="Transaction"
      onClose={() => {
        setSelected(null);
        setEditing(false);
      }}
    >
      {!tx ? (
        <p className="text-sm text-muted">This transaction is no longer available.</p>
      ) : editing ? (
        <TransactionForm initial={tx} onDone={() => setEditing(false)} />
      ) : (
        <div>
          <p
            className={`font-mono text-[34px] font-semibold tracking-tight ${
              tx.transactionType === 'INCOME' ? 'text-positive-dark' : 'text-ink'
            }`}
          >
            {formatSigned(tx.amount, tx.transactionType)}
          </p>
          <p className="mt-2 text-lg font-medium">{tx.description || tx.categoryName}</p>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {Icon && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-muted">
                  <Icon size={15} />
                </span>
              )}
              <span>{tx.categoryName}</span>
            </div>
            <p className="text-muted">{formatDateLong(tx.transactionDate)}</p>
            {account && <p className="text-muted">{account.name}</p>}
          </div>
          {intelligence(tx, transactions) && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">FinPilot Intelligence</p>
              <p className="mt-2 text-sm leading-relaxed text-ink">{intelligence(tx, transactions)}</p>
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Change category
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(tx.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
