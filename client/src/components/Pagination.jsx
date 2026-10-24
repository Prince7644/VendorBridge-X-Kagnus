import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, limit, onChange }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <nav className="vb-pagination" aria-label="Pagination">
      <span className="vb-muted">Showing {from}-{to} of {total}</span>
      <div className="vb-pagination-controls">
        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14} aria-hidden="true" /> Previous
        </button>
        <span aria-current="page">Page {page} of {pages}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
