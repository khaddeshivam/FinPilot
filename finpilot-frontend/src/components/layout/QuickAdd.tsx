import { useUiStore } from '../../store/uiStore';
import Modal from '../ui/Modal';
import AccountForm from '../../features/accounts/components/AccountForm';
import BudgetForm from '../../features/budgets/components/BudgetForm';
import TransactionForm from '../../features/transactions/components/TransactionForm';

const kinds = [
  { id: 'transaction', label: 'Transaction' },
  { id: 'account', label: 'Account' },
  { id: 'budget', label: 'Budget' },
] as const;

export default function QuickAdd() {
  const open = useUiStore((s) => s.quickAddOpen);
  const kind = useUiStore((s) => s.quickAddKind);
  const setQuickAdd = useUiStore((s) => s.setQuickAdd);

  return (
    <Modal
      open={open}
      title="Quick add"
      onClose={() => setQuickAdd(false)}
      wide={kind === 'transaction'}
    >
      <div className="mb-5 flex gap-1 rounded-full bg-canvas p-1">
        {kinds.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setQuickAdd(true, item.id)}
            className={`flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
              kind === item.id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {kind === 'transaction' && <TransactionForm onDone={() => setQuickAdd(false)} />}
      {kind === 'account' && <AccountForm onDone={() => setQuickAdd(false)} />}
      {kind === 'budget' && <BudgetForm onDone={() => setQuickAdd(false)} />}
    </Modal>
  );
}
