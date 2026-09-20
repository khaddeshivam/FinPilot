import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { register } from '../api/authApi';
import { isAxiosError } from 'axios';
import FlightPathMark from '../../../components/brand/FlightPathMark';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => navigate('/login'),
  });

  // GlobalExceptionHandler returns { fieldErrors: { email: "...", password: "..." } }
  // for validation failures, and { message: "..." } for things like duplicate
  // email - surface whichever shape actually came back.
  function errorMessage(): string | null {
    const err = registerMutation.error;
    if (!err || !isAxiosError(err)) return null;
    const data = err.response?.data;
    if (data?.fieldErrors) {
      return Object.values(data.fieldErrors as Record<string, string>).join(', ');
    }
    return data?.message ?? 'Something went wrong. Please try again.';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    registerMutation.mutate({ email, password, fullName });
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
            Track spending, set budgets that hold, and get a monthly summary grounded in your real numbers.
          </p>
        </div>
        <p className="font-mono text-xs text-ink-muted">FinPilot</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display font-semibold text-2xl text-ink mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 mb-6">Start tracking your finances with FinPilot</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
              />
            </div>

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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
              />
              <p className="text-xs text-slate-400 mt-1">At least 8 characters</p>
            </div>

            {registerMutation.isError && (
              <p className="text-sm text-red-600">{errorMessage()}</p>
            )}

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded-lg bg-ink text-white py-2.5 text-sm font-medium hover:bg-ink/90 disabled:opacity-50 transition"
            >
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-ink font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
