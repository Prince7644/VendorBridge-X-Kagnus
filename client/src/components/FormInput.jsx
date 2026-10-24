// Labelled input / select / textarea with accessible error + hint wiring.
export default function FormInput({ label, name, error, hint, required, as: Tag = 'input', children, ...rest }) {
  const id = `f-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = Tag === 'select' ? 'form-select' : 'form-control';
  return (
    <div className="vb-field">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="vb-req" aria-hidden="true"> *</span>}
      </label>
      <Tag
        id={id}
        name={name}
        className={`${control}${error ? ' is-invalid' : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </Tag>
      {hint && !error && <div id={`${id}-hint`} className="vb-hint">{hint}</div>}
      {error && <div id={`${id}-error`} className="vb-error" role="alert">{error}</div>}
    </div>
  );
}
