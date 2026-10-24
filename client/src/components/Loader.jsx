export default function Loader({ label = 'Loading' }) {
  return (
    <div className="vb-loader" role="status" aria-live="polite">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
