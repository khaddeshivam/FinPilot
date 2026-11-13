import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { isAxiosError } from 'axios';
import { register } from '../api/authApi';
import AuthLayout from '../components/AuthLayout';

function passwordLevel(password: string) { return Number(password.length >= 8) + Number(/[A-Z]/.test(password) && /[a-z]/.test(password)) + Number(/\d|[^A-Za-z0-9]/.test(password)); }

export default function RegisterPage() {
  const navigate = useNavigate(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [fullName, setFullName] = useState(''); const [showPassword, setShowPassword] = useState(false);
  const level = useMemo(() => passwordLevel(password), [password]);
  const registerMutation = useMutation({ mutationFn: register, onSuccess: () => navigate('/login') });
  const errorMessage = () => { const error = registerMutation.error; if (!error || !isAxiosError(error)) return null; const data = error.response?.data; return data?.fieldErrors ? Object.values(data.fieldErrors as Record<string, string>).join(', ') : data?.message ?? 'Something went wrong. Please try again.'; };
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); registerMutation.mutate({ email, password, fullName }); };
  const strengthLabel = ['', 'Getting started', 'Good foundation', 'Strong password'][level];

  return <AuthLayout eyebrow="START YOUR NEXT CHAPTER" title="Money, in one considered place." description="Create a calmer, more connected view of your financial world.">
    <h2>Create your account</h2><p className="fpa-intro">Start with the essentials. You can add accounts and budgets when you are ready.</p>
    <form className="fpa-form" onSubmit={handleSubmit} noValidate>
      <div className="fpa-field"><label htmlFor="register-name">Full name</label><input className="fpa-input" id="register-name" type="text" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
      <div className="fpa-field"><label htmlFor="register-email">Email address</label><input className="fpa-input" id="register-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      <div className="fpa-field"><label htmlFor="register-password">Password</label><div className="fpa-input-wrap"><input className="fpa-input fpa-input--password" id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /><button className="fpa-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><div className="fpa-strength" data-level={level} aria-label={password ? `Password strength: ${strengthLabel}` : 'Password strength'}><i /><i /><i /></div><p className="fpa-field-hint">{password ? strengthLabel : 'Use a password you do not use elsewhere.'}</p><ul className="fpa-requirements"><li>At least 8 characters</li><li>Maximum 72 bytes, per the secure password policy</li></ul></div>
      {registerMutation.isError && <p className="fpa-feedback" role="alert">{errorMessage()}</p>}
      <button className="fpa-submit" type="submit" disabled={registerMutation.isPending}>{registerMutation.isPending ? 'Creating account…' : 'Create account'}</button>
    </form>
    <p className="fpa-switch">Already have an account? <Link className="fpa-text-link" to="/login">Sign in</Link></p>
  </AuthLayout>;
}
