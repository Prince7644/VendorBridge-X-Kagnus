import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authApi } from '../services/authApi';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { validatePassword } from '../utils/validation';
import PasswordInput from '../components/PasswordInput';
import Notice from '../components/Notice';
import Logo from '../components/Logo';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    const pw = validatePassword(form.password);
    if (pw) found.password = pw;
    if (form.confirmPassword !== form.password) found.confirmPassword = 'Passwords do not match';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ token, ...form });
      navigate('/login', { replace: true, state: { notice: res.data.message } });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="vb-auth">
      <div className="vb-auth-card">
        <div className="vb-auth-brand"><Logo size="lg" /></div>
        <h1 className="vb-auth-title">Choose a new password</h1>
        {!token ? (
          <Notice type="error">This reset link is incomplete. Request a new one from the <Link to="/forgot-password">forgot password</Link> page.</Notice>
        ) : (
          <>
            {formError && <Notice type="error">{formError}</Notice>}
            <form onSubmit={submit} noValidate>
              <PasswordInput label="New password" name="password" autoComplete="new-password" required value={form.password} onChange={set} error={errors.password} hint="At least 8 characters, with a letter and a number." />
              <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" required value={form.confirmPassword} onChange={set} error={errors.confirmPassword} />
              <button type="submit" className="btn btn-primary w-100 mt-2" disabled={loading}>
                {loading ? 'Saving…' : <><KeyRound size={16} aria-hidden="true" /> Update password</>}
              </button>
            </form>
          </>
        )}
        <div className="vb-auth-links justify-content-center"><Link to="/login">Back to log in</Link></div>
      </div>
    </div>
  );
}
