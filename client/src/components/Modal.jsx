import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Accessible dialog: focus moves in, Tab is trapped, Esc closes, focus returns.
export default function Modal({ title, onClose, children, footer, size = 'md', busy = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const root = ref.current;
    const first = root.querySelector('input,select,textarea') || root.querySelector(FOCUSABLE);
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const items = [...root.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="vb-modal-backdrop">
      <div ref={ref} className={`vb-modal vb-modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="vb-modal-title">
        <div className="vb-modal-header">
          <h2 id="vb-modal-title">{title}</h2>
          <button type="button" className="vb-icon-btn" onClick={onClose} disabled={busy} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="vb-modal-body">{children}</div>
        {footer && <div className="vb-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
