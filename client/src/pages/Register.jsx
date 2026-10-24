import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, UserPlus } from 'lucide-react';
import { authApi } from '../services/authApi';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import { EMAIL_RE, PHONE_RE, validatePassword } from '../utils/validation';
import { COUNTRIES } from '../utils/countries';
import FormInput from '../components/FormInput';
import PasswordInput from '../components/PasswordInput';
import Notice from '../components/Notice';
import Logo from '../components/Logo';

// Only non-privileged roles are offered. Admin and Manager/Approver accounts are
// assigned by an Admin after sign-up (and the server rejects them regardless).
const ROLE_OPTIONS = ['Vendor', 'Procurement Officer'];

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', role: 'Vendor', country: '', additionalInformation: '', password: '', confirmPassword: '' };

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const side = Math.min(img.width, img.height);
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

export default function Register() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [avatar, setAvatar] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors((x) => ({ ...x, avatar: 'Choose an image file' })); return; }
    try {
      setAvatar(await resizeImage(file));
      setErrors((x) => ({ ...x, avatar: '' }));
    } catch {
      setErrors((x) => ({ ...x, avatar: 'That image could not be read' }));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    if (form.country.trim().length < 2) e.country = 'Country is required';
    const pw = validatePassword(form.password);
    if (pw) e.password = pw;
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      const res = await authApi.register({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), avatar: avatar || undefined });
      navigate('/login', { replace: true, state: { notice: res.data.message } });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="vb-auth">
      <div className="vb-auth-card vb-auth-wide">
        <div className="vb-auth-brand"><Logo size="lg" /></div>
        <h1 className="vb-auth-title">Create your account</h1>

        <div className="vb-photo-picker">
          <button type="button" className="vb-photo" onClick={() => fileRef.current?.click()} aria-label="Choose a profile photo (optional)">
            {avatar ? <img src={avatar} alt="Selected profile" /> : <><Camera size={22} aria-hidden="true" /><span>Photo</span></>}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickPhoto} />
          {errors.avatar && <div className="vb-error" role="alert">{errors.avatar}</div>}
        </div>

        {formError && <Notice type="error">{formError}</Notice>}

        <form onSubmit={submit} noValidate>
          <div className="row g-3">
            <div className="col-md-6"><FormInput label="First name" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={set} error={errors.firstName} /></div>
            <div className="col-md-6"><FormInput label="Last name" name="lastName" autoComplete="family-name" required value={form.lastName} onChange={set} error={errors.lastName} /></div>
            <div className="col-md-6"><FormInput label="Email address" name="email" type="email" autoComplete="email" required value={form.email} onChange={set} error={errors.email} /></div>
            <div className="col-md-6"><FormInput label="Phone number" name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={set} error={errors.phone} /></div>
            <div className="col-md-6">
              <FormInput as="select" label="Role" name="role" value={form.role} onChange={set} error={errors.role} hint="Manager/Approver and Admin access is granted by an administrator.">
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </FormInput>
            </div>
            <div className="col-md-6">
              <FormInput label="Country" name="country" list="country-list" autoComplete="country-name" required value={form.country} onChange={set} error={errors.country} />
              <datalist id="country-list">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="col-12"><FormInput as="textarea" rows={3} label="Additional information" name="additionalInformation" maxLength={1000} value={form.additionalInformation} onChange={set} error={errors.additionalInformation} hint="Optional - company, department or anything the administrator should know." /></div>
            <div className="col-md-6"><PasswordInput label="Password" name="password" autoComplete="new-password" required value={form.password} onChange={set} error={errors.password} hint="At least 8 characters, with a letter and a number." /></div>
            <div className="col-md-6"><PasswordInput label="Confirm password" name="confirmPassword" autoComplete="new-password" required value={form.confirmPassword} onChange={set} error={errors.confirmPassword} /></div>
          </div>
          <div className="text-center mt-4">
            <button type="submit" className="btn btn-primary px-5" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Registering…</> : <><UserPlus size={16} aria-hidden="true" /> Register</>}
            </button>
          </div>
        </form>
        <div className="vb-auth-links justify-content-center">
          <span>Already have an account? <Link to="/login">Log in</Link></span>
        </div>
      </div>
    </div>
  );
}
