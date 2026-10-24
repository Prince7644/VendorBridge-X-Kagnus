import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { EMAIL_RE } from '../utils/validation';
import FormInput from '../components/FormInput';
import PasswordInput from '../components/PasswordInput';
import Notice from '../components/Notice';
import Logo from '../components/Logo';

export default function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success

  const info = location.state?.notice;
  const expired = location.state?.expired;
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setStatus('loading');
    try {
      await login(form.email.trim(), form.password);
      // Success: the route guard redirects to the originally requested page.
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <div className="vb-auth">
      <div className="vb-auth-card">
        <div className="vb-auth-brand"><Logo size="lg" /></div>
        <h1 className="vb-auth-title">Sign in</h1>
        <p className="vb-muted text-center">Procurement and vendor management for your team.</p>

        {info && <Notice type="success">{info}</Notice>}
        {expired && <Notice type="warning">Your session has expired. Please sign in again.</Notice>}
        {formError && <Notice type="error">{formError}</Notice>}

        <form onSubmit={submit} noValidate>
          <FormInput label="Email address" name="email" type="email" autoComplete="username" required value={form.email} onChange={set} error={errors.email} />
          <PasswordInput label="Password" name="password" autoComplete="current-password" required value={form.password} onChange={set} error={errors.password} />
          <button type="submit" className="btn btn-primary w-100 mt-2" disabled={status !== 'idle'}>
            {status !== 'idle' ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> {status === 'success' ? 'Signed in' : 'Signing in'}…</> : <><LogIn size={16} aria-hidden="true" /> Log in</>}
          </button>
        </form>

        <div className="vb-auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <span>New here? <Link to="/register">Create an account</Link></span>
        </div>
      </div>
    </div>
  );
}
