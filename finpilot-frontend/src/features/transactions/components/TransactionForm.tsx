import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { listAccounts } from '../../accounts/api/accountsApi';
import { listCategories, type CategoryType } from '../../accounts/api/categoriesApi';
import {
  createTransaction,
  suggestCategory,
  updateTransaction,
  type CategoryPrediction,
  type TransactionResponse,
} from '../api/transactionsApi';
import { todayIso } from '../../../lib/format';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

export default function TransactionForm({
  initial,
  onDone,
}: {
  initial?: TransactionResponse;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const [accountId, setAccountId] = useState(initial ? String(initial.accountId) : '');
  const [categoryId, setCategoryId] = useState(initial ? String(initial.categoryId) : '');
  const [transactionType, setTransactionType] = useState<CategoryType>(initial?.transactionType ?? 'EXPENSE');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [transactionDate, setTransactionDate] = useState(initial?.transactionDate ?? todayIso());
  const [suggestion, setSuggestion] = useState<CategoryPrediction | null>(null);

  const filteredCategories = (categories ?? []).filter((c) => c.categoryType === transactionType);

  useEffect(() => {
    if (initial) return;
    setSuggestion(null);
    if (description.trim().length < 3) return;
    const timeoutId = setTimeout(() => {
      suggestCategory(description, transactionType)
        .then(setSuggestion)
        .catch(() => setSuggestion(null));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [description, transactionType, initial]);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof createTransaction>[0]) =>
      initial ? updateTransaction(initial.id, payload) : createTransaction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['trends'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      queryClient.invalidateQueries({ queryKey: ['healthScore'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      if (!initial) {
        setAmount('');
        setDescription('');
      }
      onDone?.();
    },
  });

  function errorMessage(): string | null {
    const err = mutation.error;
    if (!err || !isAxiosError(err)) return null;
    return err.response?.data?.message ?? 'Something went wrong. Please try again.';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accountId || !categoryId) return;
    mutation.mutate({
      accountId: Number(accountId),
      categoryId: Number(categoryId),
      transactionType,
      amount: Number(amount),
      description: description || undefined,
      transactionDate,
    });
  }

  if (!accounts || accounts.length === 0) {
    return (
      <p className="text-sm text-muted">
        You need at least one account before adding transactions. Add one from Accounts first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select
        label="Type"
        value={transactionType}
        onChange={(e) => {
          setTransactionType(e.target.value as CategoryType);
          setCategoryId('');
        }}
      >
        <option value="EXPENSE">Expense</option>
        <option value="INCOME">Income</option>
      </Select>
      <Select required label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="" disabled>
          Select account
        </option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <Select required label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="" disabled>
          Select category
        </option>
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        label="Amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        label="Date"
        type="date"
        required
        max={todayIso()}
        value={transactionDate}
        onChange={(e) => setTransactionDate(e.target.value)}
      />
      <div>
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        {suggestion && (
          <button
            type="button"
            onClick={() => {
              setCategoryId(String(suggestion.categoryId));
              setSuggestion(null);
            }}
            className="mt-1.5 text-left text-xs text-muted transition-colors hover:text-ink"
          >
            Suggested category: {suggestion.categoryName} ({Math.round(suggestion.confidence * 100)}%) — apply
          </button>
        )}
      </div>
      {mutation.isError && <p className="sm:col-span-2 text-sm text-negative">{errorMessage()}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}
        </Button>
      </div>
    </form>
  );
}
