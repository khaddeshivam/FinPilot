import { Link } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import Surface from '../../../components/ui/Surface';

const topics = [
  {
    title: 'Ledger first',
    body: 'Accounts, transactions, and budgets are the source of truth. Intelligence only reads what you recorded.',
  },
  {
    title: 'Ask FinPilot',
    body: 'Questions retrieve similar transactions from your history and cite them. If the AI key isn’t configured, rule-based insights still work.',
  },
  {
    title: 'Shortcuts',
    body: 'Press ⌘K or Ctrl+K to search, jump between pages, or add a transaction without leaving the current view.',
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Help" subtitle="How FinPilot thinks, in a few lines." />
      {topics.map((topic) => (
        <Surface key={topic.title} className="p-6">
          <h2 className="text-sm font-medium">{topic.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{topic.body}</p>
        </Surface>
      ))}
      <p className="text-sm text-muted">
        Need the monthly picture?{' '}
        <Link to="/dashboard" className="font-medium text-ink hover:underline">
          Open the dashboard
        </Link>
        .
      </p>
    </div>
  );
}
