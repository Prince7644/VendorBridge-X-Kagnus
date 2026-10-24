import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { authApi } from '../services/authApi';
import { getErrorMessage } from '../utils/errors';
import { EMAIL_RE } from '../utils/validation';
import FormInput from '../components/FormInput';
import Notice from '../components/Notice';
import Logo from '../components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) { setFieldError('Enter a valid email address'); return; }
    setFieldError('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      setMessage(res.data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vb-auth">
      <div className="vb-auth-card">
        <div className="vb-auth-brand"><Logo size="lg" /></div>
        <h1 className="vb-auth-title">Reset your password</h1>
        {message ? (
          <>
            <Notice type="success">{message}</Notice>
            <p className="vb-muted">The link is valid for a short time and can be used once.</p>
          </>
        ) : (
          <>
            <p className="vb-muted text-center">Enter your account email and we will send you a reset link.</p>
            {error && <Notice type="error">{error}</Notice>}
            <form onSubmit={submit} noValidate>
              <FormInput label="Email address" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError} />
              <button type="submit" className="btn btn-primary w-100 mt-2" disabled={loading}>
                {loading ? 'Sending…' : <><Mail size={16} aria-hidden="true" /> Send reset link</>}
              </button>
            </form>
          </>
        )}
        <div className="vb-auth-links justify-content-center"><Link to="/login">Back to log in</Link></div>
      </div>
    </div>
  );
}
