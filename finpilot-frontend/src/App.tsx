import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './store/authStore';
// Auth and landing pages are eager-loaded — they're the first thing a user
// sees and are small enough not to justify a split point.
import LandingPage from './features/marketing/pages/LandingPage';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';

// All authenticated pages are lazy-loaded. This moves recharts (the largest
// dependency) and the AI page into their own chunks that are only fetched after
// the user logs in, cutting the initial bundle from ~790 kB to roughly 200 kB.
const DashboardPage   = lazy(() => import('./features/dashboard/pages/DashboardPage'));
const AccountsPage    = lazy(() => import('./features/accounts/pages/AccountsPage'));
const TransactionsPage = lazy(() => import('./features/transactions/pages/TransactionsPage'));
const BudgetsPage     = lazy(() => import('./features/budgets/pages/BudgetsPage'));
const InsightsPage    = lazy(() => import('./features/insights/pages/InsightsPage'));
const AskPage         = lazy(() => import('./features/ai/pages/AskPage'));
const ReportsPage     = lazy(() => import('./features/reports/pages/ReportsPage'));
const SettingsPage    = lazy(() => import('./features/settings/pages/SettingsPage'));
const HelpPage        = lazy(() => import('./features/help/pages/HelpPage'));

// Fallback shown while a lazy chunk loads. The role="status" and visible text
// let screen readers announce loading state; an empty aria-busy element does not.
function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted" role="status">
      Loading page…
    </div>
  );
}

// Catches chunk-load failures (e.g. a stale deployment where an old chunk hash
// is no longer on the CDN).  Suspense only handles the pending state; a rejected
// lazy() promise falls through to an error boundary.  Without this, a failed
// chunk crashes the whole route tree with an uncaught error.
class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-muted">This page failed to load.</p>
          <button
            className="text-sm underline"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Combines the error boundary and Suspense fallback into one wrapper so every
// lazy route gets both without repeating the pair nine times.
// Keying the boundary by pathname means navigating away from a failed page
// resets the error state — without this, the "failed to load" UI persists
// even after the user successfully navigates to a different route.
function Page({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ChunkErrorBoundary key={pathname}>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}

function RootRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"     element={<Page><DashboardPage /></Page>} />
            <Route path="/accounts"      element={<Page><AccountsPage /></Page>} />
            <Route path="/transactions"  element={<Page><TransactionsPage /></Page>} />
            <Route path="/budgets"       element={<Page><BudgetsPage /></Page>} />
            <Route path="/insights"      element={<Page><InsightsPage /></Page>} />
            <Route path="/ai"            element={<Page><AskPage /></Page>} />
            <Route path="/reports"       element={<Page><ReportsPage /></Page>} />
            <Route path="/settings"      element={<Page><SettingsPage /></Page>} />
            <Route path="/help"          element={<Page><HelpPage /></Page>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
