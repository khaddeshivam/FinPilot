import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AppLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="text-lg font-semibold text-slate-900">
              FinPilot
            </Link>
            <nav className="flex items-center gap-5 text-sm text-slate-500">
              <Link to="/dashboard" className="hover:text-slate-900">Dashboard</Link>
              <Link to="/accounts" className="hover:text-slate-900">Accounts</Link>
              <Link to="/transactions" className="hover:text-slate-900">Transactions</Link>
              <Link to="/budgets" className="hover:text-slate-900">Budgets</Link>
              <Link to="/insights" className="hover:text-slate-900">Insights</Link>
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
