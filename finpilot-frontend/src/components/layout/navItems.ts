import { Home, Landmark, Lightbulb, ListOrdered, Wallet } from 'lucide-react';

// Shared navigation item definitions used by both Sidebar and MobileNav.
// Kept in a separate module so each component file only exports components
// (required for React fast-refresh to work correctly).
export const mobileNavItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/transactions', label: 'Activity', icon: ListOrdered },
  { to: '/budgets', label: 'Plan', icon: Wallet },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];
