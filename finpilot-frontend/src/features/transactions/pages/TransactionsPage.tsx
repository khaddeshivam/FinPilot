import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  listTransactions,
  createTransaction,
  suggestCategory,
  importStatement,
  type CategoryPrediction,
  type ImportSummaryResponse,
} from '../api/transactionsApi';
import { listAccounts } from '../../accounts/api/accountsApi';
import { listCategories, type CategoryType } from '../../accounts/api/categoriesApi';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({ queryKey: ['transactions'], queryFn: listTransactions });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionType, setTransactionType] = useState<CategoryType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayIso());
  const [suggestion, setSuggestion] = useState<CategoryPrediction | null>(null);

  // Only show categories matching the selected transaction type - a category's
  // type is fixed (Section: category_type is immutable per category), so an
  // EXPENSE transaction should never see INCOME categories in the dropdown.
  const filteredCategories = (categories ?? []).filter((c) => c.categoryType === transactionType);

  // Debounced - waits for a pause in typing before calling the ML endpoint,
  // rather than firing a request on every keystroke. Cleared whenever the
  // description is edited again, so a stale suggestion from a half-typed
  // earlier description never lingers on screen.
  useEffect(() => {
    setSuggestion(null);
    if (description.trim().length < 3) {
      return;
    }
    const timeoutId = setTimeout(() => {
      suggestCategory(description, transactionType)
        .then(setSuggestion)
        .catch(() => setSuggestion(null)); // silent - a missed suggestion isn't worth surfacing as an error
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [description, transactionType]);

  function applySuggestion() {
    if (suggestion) {
      setCategoryId(String(suggestion.categoryId));
      setSuggestion(null);
    }
  }

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] }); // balance changed
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAmount('');
      setDescription('');
    },
  });

  function errorMessage(): string | null {
    const err = createMutation.error;
    if (!err || !isAxiosError(err)) return null;
    return err.response?.data?.message ?? 'Something went wrong. Please try again.';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accountId || !categoryId) return;
    createMutation.mutate({
      accountId: Number(accountId),
      categoryId: Number(categoryId),
      transactionType,
      amount: Number(amount),
      description: description || undefined,
      transactionDate,
    });
  }

  // --- CSV statement import ---
  const [importAccountId, setImportAccountId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);

  const importMutation = useMutation({
    mutationFn: ({ accountId, file }: { accountId: number; file: File }) => importStatement(accountId, file),
    onSuccess: () => {
      // Balances and the transaction list changed by an unknown number of
      // rows - invalidate the same three caches a manual add touches.
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

  const hasAccounts = accounts && accounts.length > 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Transactions</h1>
        <p className="text-sm text-slate-500 mt-1">Record income and expenses</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Add a transaction</h2>

        {!hasAccounts ? (
          <p className="text-sm text-slate-400">
            You need at least one account before adding transactions - add one on the Accounts page first.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={transactionType}
                onChange={(e) => {
                  setTransactionType(e.target.value as CategoryType);
                  setCategoryId(''); // reset since available categories change
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Account</label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="" disabled>Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="" disabled>Select category</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                required
                max={todayIso()}
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {suggestion && (
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full hover:bg-indigo-100"
                >
                  ✨ Suggested: {suggestion.categoryName} ({Math.round(suggestion.confidence * 100)}%) — tap to apply
                </button>
              )}
            </div>

            {createMutation.isError && (
              <p className="sm:col-span-3 text-sm text-red-600">{errorMessage()}</p>
            )}

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add transaction'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Import a bank statement (CSV)</h2>
        <p className="text-xs text-slate-400 mb-4">
          Columns: Date, Description, Amount (positive for income, negative for expense). Each row is
          categorized automatically — using what FinPilot has learned from your own history where possible,
          keyword matching otherwise — and skipped rows are reported individually rather than failing the
          whole import.
        </p>

        {!hasAccounts ? (
          <p className="text-sm text-slate-400">Add an account first before importing a statement.</p>
        ) : (
          <form onSubmit={handleImportSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Account</label>
              <select
                required
                value={importAccountId}
                onChange={(e) => setImportAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="" disabled>Select account</option>
                {accounts!.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">CSV file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                required
                onChange={handleFileSelect}
                className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm hover:file:bg-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={importMutation.isPending || !importFile || !importAccountId}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 shrink-0"
            >
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </button>
          </form>
        )}

        {importMutation.isError && (
          <p className="text-sm text-red-600 mt-3">{importErrorMessage()}</p>
        )}

        {importMutation.isSuccess && (
          <ImportSummary summary={importMutation.data} />
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">All transactions</h2>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : !transactions || transactions.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{tx.description || tx.categoryName}</p>
                  <p className="text-xs text-slate-400">{tx.categoryName} · {tx.transactionDate}</p>
                </div>
                <span className={`text-sm font-medium ${tx.transactionType === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {tx.transactionType === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Shows exactly what the backend reports - imported count, skipped count,
// and the specific reason for every skipped row. Hiding failures behind a
// vague "some rows couldn't be imported" would make the feature harder to
// trust and harder to debug when a real statement has a format quirk.
function ImportSummary({ summary }: { summary: ImportSummaryResponse }) {
  const skippedRows = summary.rows.filter((r) => !r.imported);
  const importedRows = summary.rows.filter((r) => r.imported);

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="text-sm text-slate-700 mb-3">
        Imported <span className="font-medium text-slate-900">{summary.importedCount}</span> of{' '}
        {summary.totalRows} rows
        {summary.skippedCount > 0 && (
          <span className="text-slate-400"> — {summary.skippedCount} skipped</span>
        )}
        .
      </p>

      {importedRows.length > 0 && (
        <div className="space-y-1 mb-3">
          {importedRows.slice(0, 8).map((row) => (
            <div key={row.rowNumber} className="flex items-center justify-between text-xs bg-emerald-50 rounded-lg px-3 py-2">
              <span className="text-slate-700">{row.description}</span>
              <span className="text-emerald-700 font-medium">{row.categoryName}</span>
            </div>
          ))}
          {importedRows.length > 8 && (
            <p className="text-xs text-slate-400">+ {importedRows.length - 8} more imported</p>
          )}
        </div>
      )}

      {skippedRows.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 mb-1">Skipped rows</p>
          {skippedRows.map((row) => (
            <div key={row.rowNumber} className="flex items-center justify-between text-xs bg-amber-50 rounded-lg px-3 py-2">
              <span className="text-slate-600">Row {row.rowNumber}</span>
              <span className="text-amber-700">{row.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
