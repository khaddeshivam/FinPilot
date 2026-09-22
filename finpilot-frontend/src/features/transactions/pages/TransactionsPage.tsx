import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Search } from 'lucide-react';
import { listAccounts } from '../../accounts/api/accountsApi';
import { listCategories } from '../../accounts/api/categoriesApi';
import { importStatement, listTransactions, type ImportSummaryResponse } from '../api/transactionsApi';
import { formatDate } from '../../../lib/format';
import { useUiStore } from '../../../store/uiStore';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/layout/PageHeader';
import Select from '../../../components/ui/Select';
import Surface from '../../../components/ui/Surface';
import TransactionRow from '../../../components/finance/TransactionRow';
import Skeleton from '../../../components/ui/Skeleton';
import TransactionForm from '../components/TransactionForm';

export default function TransactionsPage() {
  const setQuickAdd = useUiStore((s) => s.setQuickAdd);
  const setSelected = useUiStore((s) => s.setSelectedTransactionId);
  const { data: transactions, isLoading } = useQuery({ queryKey: ['transactions'], queryFn: listTransactions });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const [query, setQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(() => {
    return (transactions ?? []).filter((tx) => {
      const hay = `${tx.description ?? ''} ${tx.categoryName}`.toLowerCase();
      if (query && !hay.includes(query.toLowerCase())) return false;
      if (accountFilter && String(tx.accountId) !== accountFilter) return false;
      if (categoryFilter && String(tx.categoryId) !== categoryFilter) return false;
      if (typeFilter && tx.transactionType !== typeFilter) return false;
      if (dateFilter && tx.transactionDate !== dateFilter) return false;
      return true;
    });
  }, [transactions, query, accountFilter, categoryFilter, typeFilter, dateFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const key = tx.transactionDate;
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Track and understand every movement of your money."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowImport((v) => !v)}>
              Import CSV
            </Button>
            <Button onClick={() => setQuickAdd(true, 'transaction')}>Add transaction</Button>
          </>
        }
      />

      {showImport && <ImportPanel />}

      <Surface className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="relative sm:col-span-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions"
              className="h-10 w-full rounded-[12px] border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-ink/30"
            />
          </label>
          <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="">Any date</option>
            {[...new Set((transactions ?? []).map((t) => t.transactionDate))].slice(0, 40).map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 max-w-[200px]">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </Select>
        </div>
      </Surface>

      <Surface className="p-3 sm:p-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            body="Once you add your first transaction, FinPilot will start understanding your spending patterns."
            action="Add transaction"
            onAction={() => setQuickAdd(true, 'transaction')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nothing matches" body="Try clearing a filter or searching a merchant or category." />
        ) : (
          grouped.map(([date, rows]) => (
            <div key={date} className="mb-2">
              <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                {formatDate(date)}
              </p>
              {rows.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  accountName={accounts.find((a) => a.id === tx.accountId)?.name}
                  onClick={() => setSelected(tx.id)}
                />
              ))}
            </div>
          ))
        )}
      </Surface>

      <Surface className="p-6">
        <h2 className="mb-4 text-sm font-medium">Add a transaction</h2>
        <TransactionForm />
      </Surface>
    </div>
  );
}

function ImportPanel() {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const [importAccountId, setImportAccountId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);

  const importMutation = useMutation({
    mutationFn: ({ accountId, file }: { accountId: number; file: File }) => importStatement(accountId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setImportFile(null);
    },
  });

  function importErrorMessage(): string | null {
    const err = importMutation.error;
    if (!err || !isAxiosError(err)) return null;
    return err.response?.data?.message ?? 'Could not import this file. Please try again.';
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    setImportFile(e.target.files?.[0] ?? null);
  }

  function handleImportSubmit(e: FormEvent) {
    e.preventDefault();
    if (!importAccountId || !importFile) return;
    importMutation.mutate({ accountId: Number(importAccountId), file: importFile });
  }

  return (
    <Surface className="p-6">
      <h2 className="text-sm font-medium">Import a bank statement (CSV)</h2>
      <p className="mb-4 mt-1 text-[13px] text-muted">
        Columns: Date, Description, Amount (positive for income, negative for expense). Each row is categorized
        automatically.
      </p>
      {accounts.length === 0 ? (
        <p className="text-sm text-muted">Add an account first before importing a statement.</p>
      ) : (
        <form onSubmit={handleImportSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Select required label="Account" value={importAccountId} onChange={(e) => setImportAccountId(e.target.value)}>
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted">CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              required
              onChange={handleFileSelect}
              className="mt-1.5 w-full text-sm text-muted file:mr-3 file:rounded-[12px] file:border-0 file:bg-canvas file:px-3 file:py-2 file:text-sm file:text-ink"
            />
          </div>
          <Button type="submit" disabled={importMutation.isPending || !importFile || !importAccountId}>
            {importMutation.isPending ? 'Importing…' : 'Import'}
          </Button>
        </form>
      )}
      {importMutation.isError && <p className="mt-3 text-sm text-negative">{importErrorMessage()}</p>}
      {importMutation.isSuccess && <ImportSummary summary={importMutation.data} />}
    </Surface>
  );
}

function ImportSummary({ summary }: { summary: ImportSummaryResponse }) {
  const skippedRows = summary.rows.filter((r) => !r.imported);
  const importedRows = summary.rows.filter((r) => r.imported);

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="mb-3 text-sm">
        Imported <span className="font-medium">{summary.importedCount}</span> of {summary.totalRows} rows
        {summary.skippedCount > 0 && <span className="text-muted"> — {summary.skippedCount} skipped</span>}.
      </p>
      {importedRows.slice(0, 8).map((row) => (
        <div key={row.rowNumber} className="mb-1 flex justify-between rounded-xl bg-canvas px-3 py-2 text-xs">
          <span>{row.description}</span>
          <span className="text-positive-dark">{row.categoryName}</span>
        </div>
      ))}
      {skippedRows.map((row) => (
        <div key={row.rowNumber} className="mb-1 flex justify-between rounded-xl bg-warning/10 px-3 py-2 text-xs">
          <span>Row {row.rowNumber}</span>
          <span className="text-warning">{row.reason}</span>
        </div>
      ))}
    </div>
  );
}
