import { Home, Landmark, Lightbulb, ListOrdered, Wallet } from 'lucide-react';

// Navigation item definitions used by MobileNav.
// Sidebar maintains its own separate primary/secondary arrays.
// Kept in a separate module so each component file only exports components
// (required for React fast-refresh to work correctly).
export const mobileNavItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/transactions', label: 'Activity', icon: ListOrdered },
  { to: '/budgets', label: 'Plan', icon: Wallet },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];
