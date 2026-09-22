import { NavLink } from 'react-router-dom';
import {
  CircleHelp,
  Home,
  Landmark,
  LayoutGrid,
  Lightbulb,
  ListOrdered,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react';

const primary = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/transactions', label: 'Transactions', icon: ListOrdered },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
  { to: '/ai', label: 'AI', icon: Sparkles },
  { to: '/reports', label: 'Reports', icon: LayoutGrid },
];

const secondary = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/help', label: 'Help', icon: CircleHelp },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center bg-sidebar py-4 md:flex">
      <NavLink
        to="/dashboard"
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition-colors hover:bg-white/15"
        aria-label="FinPilot home"
      >
        <span className="font-display text-lg font-semibold">F</span>
      </NavLink>
      <nav className="flex flex-1 flex-col items-center gap-1.5" aria-label="Primary">
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 ${
                isActive ? 'bg-white text-ink' : 'text-white/55 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.75} />
          </NavLink>
        ))}
      </nav>
      <nav className="flex flex-col items-center gap-1.5" aria-label="Secondary">
        {secondary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 ${
                isActive ? 'bg-white text-ink' : 'text-white/55 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.75} />
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export const mobileNavItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/transactions', label: 'Activity', icon: ListOrdered },
  { to: '/budgets', label: 'Plan', icon: Wallet },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];
