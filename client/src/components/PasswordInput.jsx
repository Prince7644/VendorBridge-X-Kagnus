import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ label, name, error, hint, required, ...rest }) {
  const [visible, setVisible] = useState(false);
  const id = `f-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="vb-field">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="vb-req" aria-hidden="true"> *</span>}
      </label>
      <div className="vb-password">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          className={`form-control${error ? ' is-invalid' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        <button type="button" className="vb-icon-btn" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && !error && <div id={`${id}-hint`} className="vb-hint">{hint}</div>}
      {error && <div id={`${id}-error`} className="vb-error" role="alert">{error}</div>}
    </div>
  );
}
