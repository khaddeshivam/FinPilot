import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { listCategories } from '../../accounts/api/categoriesApi';
import { setBudget } from '../api/budgetsApi';
import { currentMonthIso } from '../../../lib/format';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

export default function BudgetForm({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient();
  const month = currentMonthIso();
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const expenseCategories = (categories ?? []).filter((c) => c.categoryType === 'EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  const mutation = useMutation({
    mutationFn: setBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAmount('');
      setCategoryId('');
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
    if (!categoryId) return;
    mutation.mutate({
      categoryId: Number(categoryId),
      periodMonth: month,
      amount: Number(amount),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select required label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="" disabled>
          Select category
        </option>
        {expenseCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        label="Monthly limit"
        type="number"
        step="0.01"
        min="0.01"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {mutation.isError && <p className="sm:col-span-2 text-sm text-negative">{errorMessage()}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save budget'}
        </Button>
      </div>
    </form>
  );
}
