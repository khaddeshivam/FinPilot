import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAccount, type AccountType } from '../api/accountsApi';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ACCOUNT_TYPES: AccountType[] = ['BANK', 'CASH', 'CREDIT_CARD', 'WALLET'];

export default function AccountForm({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('BANK');
  const [openingBalance, setOpeningBalance] = useState('');

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setName('');
      setOpeningBalance('');
      onDone?.();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name,
      accountType,
      openingBalance: openingBalance ? Number(openingBalance) : 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input
          label="Name"
          required
          placeholder="e.g. HDFC Savings"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Select label="Type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
        {ACCOUNT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type.replace('_', ' ')}
          </option>
        ))}
      </Select>
      <Input
        label="Opening balance"
        type="number"
        step="0.01"
        placeholder="0"
        value={openingBalance}
        onChange={(e) => setOpeningBalance(e.target.value)}
      />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Adding…' : 'Add account'}
        </Button>
      </div>
    </form>
  );
}
