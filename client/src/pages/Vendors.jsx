import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Eye, Pencil, Plus, Search, SearchX, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { vendorApi } from '../services/vendorApi';
import useFetch from '../hooks/useFetch';
import useNotice from '../hooks/useNotice';
import { getErrorMessage } from '../utils/errors';
import { formatDate } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import Notice from '../components/Notice';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import VendorForm, { CATEGORIES } from '../components/vendors/VendorForm';
import VendorDetails from '../components/vendors/VendorDetails';

const LIMIT = 10;
const TABS = ['All', 'Active', 'Pending', 'Inactive', 'Blocked'];

export default function Vendors() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const status = params.get('status') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [modal, setModal] = useState(() => (params.get('add') && can('vendor:create') ? { type: 'form', mode: 'create' } : null));
  const [archiving, setArchiving] = useState({ busy: false, error: '' });
  const { notice, show, clear } = useNotice();

  const canCreate = can('vendor:create');
  const canEdit = can('vendor:update');
  const canApprove = can('vendor:approve');
  const canArchive = can('vendor:archive');

  // React Router's setSearchParams merges against the params of the *last render*,
  // so two quick changes (typing in search, then picking a filter) would overwrite
  // each other. This ref always holds the latest merged params.
  const latest = useRef(params);
  latest.current = params;
  const update = (changes) => {
    const next = new URLSearchParams(latest.current);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    latest.current = next;
    setParams(next, { replace: true });
  };

  // The ?add=1 flag from the dashboard quick action is consumed once.
  useEffect(() => {
    if (params.get('add')) update({ add: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced server-side search.
  useEffect(() => {
    if (searchInput === search) return undefined;
    const t = setTimeout(() => update({ search: searchInput.trim(), page: '' }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const { data, loading, error, reload } = useFetch(
    () => vendorApi.list({ search: search || undefined, category: category || undefined, status: status || undefined, page, limit: LIMIT }),
    [search, category, status, page]
  );

  const items = data?.items || [];
  const filtered = Boolean(search || category || status);

  const openView = (v) => setModal({ type: 'view', vendor: v });
  const openEdit = (v) => setModal({ type: 'form', mode: canEdit ? 'edit' : 'status', vendor: v });
  const openArchive = (v) => { setArchiving({ busy: false, error: '' }); setModal({ type: 'archive', vendor: v }); };
  const close = () => setModal(null);

  const saved = (message) => { close(); show('success', message); reload(); };

  const confirmArchive = async () => {
    setArchiving({ busy: true, error: '' });
    try {
      const res = await vendorApi.archive(modal.vendor.id);
      close();
      show('success', res.message);
      if (items.length === 1 && page > 1) update({ page: String(page - 1) }); else reload();
    } catch (err) {
      setArchiving({ busy: false, error: getErrorMessage(err) });
    }
  };

  return (
    <div>
      <div className="vb-page-head">
        <div>
          <h1>Vendors</h1>
          <p className="vb-muted">Manage supplier profiles and registrations</p>
        </div>
        {canCreate && <button type="button" className="btn btn-primary" onClick={() => setModal({ type: 'form', mode: 'create' })}><Plus size={16} aria-hidden="true" /> Add vendor</button>}
      </div>

      {notice && <Notice type={notice.type} onDismiss={clear}>{notice.message}</Notice>}

      <div className="vb-toolbar">
        <div className="vb-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" className="form-control" placeholder="Search by name, contact, GST number, category…" aria-label="Search vendors" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <select className="form-select vb-category-filter" aria-label="Filter by category" value={category} onChange={(e) => update({ category: e.target.value, page: '' })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="vb-chips" role="group" aria-label="Filter by status">
        {TABS.map((t) => {
          const active = (status || 'All') === t;
          return (
            <button key={t} type="button" className={`vb-chip${active ? ' active' : ''}`} aria-pressed={active} onClick={() => update({ status: t === 'All' ? '' : t, page: '' })}>
              {t}{data ? ` (${data.counts[t]})` : ''}
            </button>
          );
        })}
      </div>

      {error && <Notice type="error" onRetry={reload}>{error}</Notice>}
      {loading && !data && <Loader label="Loading vendors" />}

      {data && (
        <div className="vb-panel vb-table-panel" aria-busy={loading}>
          {items.length === 0 ? (
            filtered ? (
              <EmptyState icon={SearchX} title="No vendors match your filters" action={<button type="button" className="btn btn-outline-secondary mt-3" onClick={() => { setSearchInput(''); setParams({}, { replace: true }); }}>Clear filters</button>}>
                Try a different search term, category or status.
              </EmptyState>
            ) : (
              <EmptyState icon={Building2} title="No vendors yet" action={canCreate && <button type="button" className="btn btn-primary mt-3" onClick={() => setModal({ type: 'form', mode: 'create' })}><Plus size={16} aria-hidden="true" /> Add the first vendor</button>}>
                {canCreate ? 'Register suppliers to start building your vendor list.' : 'No vendor record is available to you yet.'}
              </EmptyState>
            )
          ) : (
            <div className="table-responsive">
              <table className="table vb-table align-middle">
                <thead>
                  <tr><th scope="col">Vendor name</th><th scope="col">Category</th><th scope="col">GST / Tax ID</th><th scope="col">Contact</th><th scope="col">Status</th><th scope="col">Added</th><th scope="col" className="text-end">Action</th></tr>
                </thead>
                <tbody>
                  {items.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.vendorName}</strong>{v.isDemo && <span className="vb-demo" title="Development seed data">Demo</span>}</td>
                      <td>{v.category}</td>
                      <td className="vb-nowrap">{v.gstNumber || <span className="vb-muted">-</span>}</td>
                      <td><div>{v.contactPerson}</div><div className="vb-muted small">{v.phone}</div></td>
                      <td><StatusBadge status={v.status} /></td>
                      <td className="vb-nowrap">{formatDate(v.createdAt)}</td>
                      <td className="text-end vb-nowrap">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openView(v)} aria-label={`View ${v.vendorName}`}><Eye size={14} aria-hidden="true" /> View</button>
                        {(canEdit || canApprove) && <button type="button" className="btn btn-sm btn-outline-secondary ms-1" onClick={() => openEdit(v)} aria-label={`${canEdit ? 'Edit' : 'Change status of'} ${v.vendorName}`}><Pencil size={14} aria-hidden="true" /></button>}
                        {canArchive && <button type="button" className="btn btn-sm btn-outline-danger ms-1" onClick={() => openArchive(v)} aria-label={`Archive ${v.vendorName}`}><Trash2 size={14} aria-hidden="true" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />
        </div>
      )}

      {modal?.type === 'view' && (
        <VendorDetails
          vendor={modal.vendor} canEdit={canEdit} canChangeStatus={canApprove} canArchive={canArchive}
          onEdit={() => openEdit(modal.vendor)} onArchive={() => openArchive(modal.vendor)} onClose={close}
        />
      )}
      {modal?.type === 'form' && <VendorForm vendor={modal.vendor} mode={modal.mode} canApprove={canApprove} onClose={close} onSaved={saved} />}
      {modal?.type === 'archive' && (
        <ConfirmDialog title="Archive vendor?" danger confirmLabel="Archive vendor" busy={archiving.busy} error={archiving.error} onConfirm={confirmArchive} onCancel={close}>
          <p><strong>{modal.vendor.vendorName}</strong> will be removed from the vendor list. The record is kept for audit purposes and its name can be reused.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
