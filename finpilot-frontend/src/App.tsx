import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Minimal fallback shown while a lazy chunk loads. Deliberately unstyled so
// it doesn't flash the app shell before the page is ready.
function PageFallback() {
  return <div className="flex min-h-screen items-center justify-center" aria-busy="true" />;
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
            <Route
              path="/dashboard"
              element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>}
            />
            <Route
              path="/accounts"
              element={<Suspense fallback={<PageFallback />}><AccountsPage /></Suspense>}
            />
            <Route
              path="/transactions"
              element={<Suspense fallback={<PageFallback />}><TransactionsPage /></Suspense>}
            />
            <Route
              path="/budgets"
              element={<Suspense fallback={<PageFallback />}><BudgetsPage /></Suspense>}
            />
            <Route
              path="/insights"
              element={<Suspense fallback={<PageFallback />}><InsightsPage /></Suspense>}
            />
            <Route
              path="/ai"
              element={<Suspense fallback={<PageFallback />}><AskPage /></Suspense>}
            />
            <Route
              path="/reports"
              element={<Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>}
            />
            <Route
              path="/settings"
              element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>}
            />
            <Route
              path="/help"
              element={<Suspense fallback={<PageFallback />}><HelpPage /></Suspense>}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
