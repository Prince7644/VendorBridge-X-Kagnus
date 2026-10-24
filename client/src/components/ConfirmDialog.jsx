import Modal from './Modal';

export default function ConfirmDialog({ title, children, confirmLabel = 'Confirm', danger, busy, error, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      busy={busy}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {children}
      {error && <div className="vb-error mt-3" role="alert">{error}</div>}
    </Modal>
  );
}
