import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './features/marketing/pages/LandingPage';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import AccountsPage from './features/accounts/pages/AccountsPage';
import TransactionsPage from './features/transactions/pages/TransactionsPage';
import BudgetsPage from './features/budgets/pages/BudgetsPage';
import InsightsPage from './features/insights/pages/InsightsPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './store/authStore';

// "/" was previously an unconditional redirect straight to /dashboard,
// which meant every visitor - logged in or not - bounced through /login
// with no landing page ever shown. This restores an actual first
// impression for logged-out visitors, while still sending an already
// logged-in user straight to their dashboard rather than the marketing page.
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
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
