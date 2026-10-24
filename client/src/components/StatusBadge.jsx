import { Ban, CheckCircle2, Clock, MinusCircle } from 'lucide-react';

// Status is conveyed by icon + text, never by colour alone.
const CONFIG = {
  Active: { icon: CheckCircle2, cls: 'active' },
  Pending: { icon: Clock, cls: 'pending' },
  Inactive: { icon: MinusCircle, cls: 'inactive' },
  Blocked: { icon: Ban, cls: 'blocked' },
};

export default function StatusBadge({ status }) {
  const { icon: Icon, cls } = CONFIG[status] || CONFIG.Inactive;
  return (
    <span className={`vb-badge vb-badge-${cls}`}>
      <Icon size={13} aria-hidden="true" />
      {status}
    </span>
  );
}
