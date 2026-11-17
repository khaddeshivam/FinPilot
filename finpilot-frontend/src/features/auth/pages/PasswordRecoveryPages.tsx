import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import AuthLayout from '../components/AuthLayout';
import { confirmEmailVerification, confirmPasswordReset, exchangeOAuthCode, requestPasswordReset } from '../api/authApi';
import { useAuthStore } from '../../../store/authStore';

function failureMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  const mutation = useMutation({ mutationFn: requestPasswordReset, onSuccess: () => setSent(true) });
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate(email); };
  return <AuthLayout eyebrow="PASSWORD RECOVERY" title="Keep your account in reach." description="We will send a secure, time-limited link if an account exists for your email."><h2>Reset your password</h2><p className="fpa-intro">Enter the email address you use for FinPilot.</p>{sent ? <p className="fpa-success" role="status">If that email has a FinPilot account, a reset link is on its way.</p> : <form className="fpa-form" onSubmit={submit}><div className="fpa-field"><label htmlFor="recovery-email">Email address</label><input className="fpa-input" id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>{mutation.isError && <p className="fpa-feedback" role="alert">{failureMessage(mutation.error, 'We could not request a reset link. Please try again.')}</p>}<button className="fpa-submit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Sending link…' : 'Send reset link'}</button></form>}<p className="fpa-switch"><Link className="fpa-text-link" to="/login">Return to sign in</Link></p></AuthLayout>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''; const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [complete, setComplete] = useState(false);
  const mutation = useMutation({ mutationFn: () => confirmPasswordReset(token, password), onSuccess: () => setComplete(true) }); const mismatch = confirm.length > 0 && password !== confirm;
  const submit = (event: FormEvent) => { event.preventDefault(); if (password === confirm) mutation.mutate(); };
  return <AuthLayout eyebrow="PASSWORD RECOVERY" title="A secure reset starts here." description="Choose a new password for your FinPilot account."><h2>Set a new password</h2><p className="fpa-intro">This link can be used once and expires shortly after it was requested.</p>{complete ? <p className="fpa-success" role="status">Your password has been reset. You can now sign in with your new password.</p> : <form className="fpa-form" onSubmit={submit}><div className="fpa-field"><label htmlFor="new-password">New password</label><input className="fpa-input" id="new-password" type="password" autoComplete="new-password" minLength={8} required disabled={!token} value={password} onChange={(event) => setPassword(event.target.value)} /></div><div className="fpa-field"><label htmlFor="confirm-password">Confirm new password</label><input className="fpa-input" id="confirm-password" type="password" autoComplete="new-password" minLength={8} required disabled={!token} value={confirm} onChange={(event) => setConfirm(event.target.value)} aria-invalid={mismatch} />{mismatch && <p className="fpa-field-hint">Passwords do not match.</p>}</div>{(!token || mutation.isError) && <p className="fpa-feedback" role="alert">{token ? failureMessage(mutation.error, 'This reset link is invalid or expired.') : 'This reset link is missing or invalid.'}</p>}<button className="fpa-submit" type="submit" disabled={!token || mismatch || mutation.isPending}>{mutation.isPending ? 'Updating password…' : 'Set new password'}</button></form>}<p className="fpa-switch"><Link className="fpa-text-link" to="/login">Return to sign in</Link></p></AuthLayout>;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''; const [complete, setComplete] = useState(false); const mutation = useMutation({ mutationFn: () => confirmEmailVerification(token), onSuccess: () => setComplete(true) });
  useEffect(() => { if (token) mutation.mutate(); }, [token]);
  return <AuthLayout eyebrow="EMAIL VERIFICATION" title="A little extra certainty." description="Confirming your email keeps your FinPilot account details up to date."><h2>{complete ? 'Email verified' : 'Verifying your email'}</h2><p className="fpa-intro">{complete ? 'Your email address has been verified successfully.' : mutation.isError || !token ? 'This verification link is invalid or expired.' : 'Please wait while we verify your secure link.'}</p>{mutation.isError && <p className="fpa-feedback" role="alert">The link may already have been used or has expired.</p>}<p className="fpa-switch"><Link className="fpa-text-link" to="/login">Return to sign in</Link></p></AuthLayout>;
}

export function OAuthCallbackPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const setTokens = useAuthStore((state) => state.setTokens); const code = params.get('code') ?? ''; const mutation = useMutation({ mutationFn: () => exchangeOAuthCode(code), onSuccess: (data) => { setTokens(data.accessToken, data.refreshToken); navigate('/dashboard', { replace: true }); } });
  useEffect(() => { if (code) mutation.mutate(); }, [code]);
  return <AuthLayout eyebrow="GOOGLE SIGN IN" title="Bringing you into focus." description="We are securely finishing your FinPilot sign-in."><h2>{mutation.isError || !code ? 'Sign-in unavailable' : 'Signing you in'}</h2><p className="fpa-intro">{mutation.isError || !code ? 'That Google sign-in link is invalid or has expired. Please try again.' : 'Your verified Google identity is being connected to FinPilot.'}</p><p className="fpa-switch"><Link className="fpa-text-link" to="/login">Return to sign in</Link></p></AuthLayout>;
}
