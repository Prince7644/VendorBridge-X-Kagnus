import { AlertCircle, CheckCircle2, Info, RefreshCw, X } from 'lucide-react';

const ICONS = { error: AlertCircle, success: CheckCircle2, info: Info, warning: AlertCircle };

// Inline message banner. Errors can offer a Retry action.
export default function Notice({ type = 'info', children, onRetry, onDismiss }) {
  const Icon = ICONS[type];
  return (
    <div className={`vb-notice vb-notice-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <div className="vb-notice-body">{children}</div>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" /> Retry
        </button>
      )}
      {onDismiss && (
        <button type="button" className="vb-icon-btn" onClick={onDismiss} aria-label="Dismiss message">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
