import { Handshake } from 'lucide-react';

export default function Logo({ size = 'md' }) {
  return (
    <span className={`vb-logo vb-logo-${size}`}>
      <span className="vb-logo-mark"><Handshake size={size === 'lg' ? 28 : 18} aria-hidden="true" /></span>
      <span className="vb-logo-text">VendorBridge</span>
    </span>
  );
}
