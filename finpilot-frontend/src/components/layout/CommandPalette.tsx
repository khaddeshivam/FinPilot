import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Landmark,
  LayoutGrid,
  Lightbulb,
  ListOrdered,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

const commands = [
  { id: 'add-tx', group: 'Actions', label: 'Add transaction', icon: Plus, run: 'quick:transaction' },
  { id: 'add-acc', group: 'Actions', label: 'Add account', icon: Plus, run: 'quick:account' },
  { id: 'add-bud', group: 'Actions', label: 'Create budget', icon: Plus, run: 'quick:budget' },
  { id: 'nav-home', group: 'Navigate', label: 'Dashboard', icon: Home, run: '/dashboard' },
  { id: 'nav-acc', group: 'Navigate', label: 'Accounts', icon: Landmark, run: '/accounts' },
  { id: 'nav-tx', group: 'Navigate', label: 'Transactions', icon: ListOrdered, run: '/transactions' },
  { id: 'nav-bud', group: 'Navigate', label: 'Budgets', icon: Wallet, run: '/budgets' },
  { id: 'nav-ins', group: 'Navigate', label: 'Insights', icon: Lightbulb, run: '/insights' },
  { id: 'nav-ai', group: 'AI', label: 'Ask FinPilot', icon: Sparkles, run: '/ai' },
  { id: 'nav-rep', group: 'Navigate', label: 'Reports', icon: LayoutGrid, run: '/reports' },
  { id: 'nav-set', group: 'Navigate', label: 'Settings', icon: Settings, run: '/settings' },
] as const;

export default function CommandPalette() {
  const navigate = useNavigate();
  const open = useUiStore((s) => s.commandOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setQuickAdd = useUiStore((s) => s.setQuickAdd);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...commands];
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(!open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setCommandOpen]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  function run(cmd: (typeof commands)[number]) {
    setCommandOpen(false);
    if (cmd.run.startsWith('quick:')) {
      setQuickAdd(true, cmd.run.replace('quick:', '') as 'transaction' | 'account' | 'budget');
      return;
    }
    navigate(cmd.run);
  }

  const groups = [...new Set(filtered.map((c) => c.group))];

  return (
    <div className="fp-overlay fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-[18vh]">
      <button className="absolute inset-0" aria-label="Close command palette" onClick={() => setCommandOpen(false)} />
      <div
        role="dialog"
        aria-label="Command palette"
        className="fp-panel relative w-full max-w-lg overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_24px_60px_rgba(17,19,21,0.16)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FinPilot..."
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && filtered[active]) {
                e.preventDefault();
                run(filtered[active]);
              } else if (e.key === 'Escape') {
                setCommandOpen(false);
              }
            }}
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted">No matching commands.</p>
          )}
          {groups.map((group) => (
            <div key={group} className="mb-2">
              <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">{group}</p>
              {filtered
                .filter((c) => c.group === group)
                .map((cmd) => {
                  const index = filtered.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => run(cmd)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        index === active ? 'bg-canvas' : ''
                      }`}
                    >
                      <cmd.icon size={16} className="text-muted" />
                      {cmd.label}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
