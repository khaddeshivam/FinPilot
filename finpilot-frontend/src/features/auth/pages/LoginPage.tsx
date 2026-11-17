import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../api/authApi';
import { useAuthStore } from '../../../store/authStore';
import { API_BASE_URL } from '../../../lib/apiConfig';
import AuthLayout from '../components/AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useMutation({ mutationFn: login, onSuccess: (data) => { setTokens(data.accessToken, data.refreshToken); navigate('/dashboard'); } });
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); loginMutation.mutate({ email, password }); };

  return <AuthLayout eyebrow="WELCOME BACK" title="A clearer view of your money." description="Pick up where you left off, with the numbers and context that matter most.">
    <h2>Welcome back</h2><p className="fpa-intro">Sign in to continue to your FinPilot workspace.</p>
    <form className="fpa-form" onSubmit={handleSubmit} noValidate>
      <div className="fpa-field"><label htmlFor="login-email">Email address</label><input className="fpa-input" id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={loginMutation.isError} /></div>
      <div className="fpa-field"><label htmlFor="login-password">Password</label><div className="fpa-input-wrap"><input className="fpa-input fpa-input--password" id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={loginMutation.isError} /><button className="fpa-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
      <div className="fpa-support-row"><span className="fpa-field-hint">Your session ends when you close this tab.</span><Link className="fpa-text-link" to="/forgot-password">Forgot password?</Link></div>
      {loginMutation.isError && <p className="fpa-feedback" role="alert">Invalid email or password. Please try again.</p>}
      <button className="fpa-submit" type="submit" disabled={loginMutation.isPending}>{loginMutation.isPending ? 'Signing in…' : 'Sign in'}</button>
      <a className="fpa-oauth-button" href={`${API_BASE_URL}/oauth2/authorization/google`}>Continue with Google</a>
    </form>
    <p className="fpa-switch">New to FinPilot? <Link className="fpa-text-link" to="/register">Create an account</Link></p>
  </AuthLayout>;
}
