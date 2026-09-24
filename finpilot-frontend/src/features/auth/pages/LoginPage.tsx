import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login } from '../api/authApi';
import { useAuthStore } from '../../../store/authStore';
import FlightPathMark from '../../../components/brand/FlightPathMark';

export default function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      navigate('/dashboard');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-sans">
      {/* Brand panel - echoes the landing page hero, quieter (no draw-in animation) */}
      <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-12">
        <Link to="/" className="font-display font-semibold text-lg tracking-tight">
          FinPilot
        </Link>
        <div>
          <FlightPathMark className="w-full h-auto max-w-sm mb-8" />
          <p className="text-ink-muted text-lg leading-relaxed max-w-sm">
            Rules you can verify, budgets that stay honest, and a monthly summary grounded in your real numbers.
          </p>
        </div>
        <p className="font-mono text-xs text-ink-muted">FinPilot</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display font-semibold text-2xl text-ink mb-1 tracking-tight">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-6">Log in to FinPilot</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
              />
            </div>

            {loginMutation.isError && (
              <p className="text-sm text-red-600">
                Invalid email or password. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-lg bg-ink text-white py-2.5 text-sm font-medium hover:bg-ink/90 disabled:opacity-50 transition"
            >
              {loginMutation.isPending ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-ink font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
