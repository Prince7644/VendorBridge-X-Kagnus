import { useEffect, useState } from 'react';
import { Search, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/userApi';
import useFetch from '../hooks/useFetch';
import useNotice from '../hooks/useNotice';
import { getErrorMessage } from '../utils/errors';
import { formatDate } from '../utils/format';
import Notice from '../components/Notice';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Avatar from '../components/Avatar';

const ROLES = ['Procurement Officer', 'Vendor', 'Manager/Approver', 'Admin'];
const STATUSES = ['active', 'pending', 'disabled'];
const LIMIT = 20;

export default function Users() {
  const { user: me } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState('');
  const { notice, show, clear } = useNotice();

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, loading, error, reload } = useFetch(
    () => userApi.list({ search: search || undefined, role: role || undefined, page, limit: LIMIT }),
    [search, role, page]
  );

  const change = async (u, changes) => {
    setSavingId(u.id);
    try {
      const res = await userApi.update(u.id, changes);
      show('success', `${res.message} (${u.firstName} ${u.lastName})`);
      reload();
    } catch (err) {
      show('error', getErrorMessage(err));
    } finally {
      setSavingId('');
    }
  };

  return (
    <div>
      <div className="vb-page-head"><div><h1>Users</h1><p className="vb-muted">Approve sign-ups and assign roles. Only administrators can see this page.</p></div></div>
      {notice && <Notice type={notice.type} onDismiss={clear}>{notice.message}</Notice>}

      <div className="vb-toolbar">
        <div className="vb-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" className="form-control" placeholder="Search by name or email…" aria-label="Search users" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <select className="form-select vb-category-filter" aria-label="Filter by role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {error && <Notice type="error" onRetry={reload}>{error}</Notice>}
      {loading && !data && <Loader label="Loading users" />}
      {data && (
        <div className="vb-panel vb-table-panel">
          {data.items.length === 0 ? (
            <EmptyState icon={UserX} title="No users found">Try a different search or role.</EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="table vb-table align-middle">
                <thead><tr><th scope="col">User</th><th scope="col">Registered</th><th scope="col">Role</th><th scope="col">Account status</th></tr></thead>
                <tbody>
                  {data.items.map((u) => {
                    const self = u.id === me.id;
                    const busy = savingId === u.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <Avatar user={u} size={32} />
                            <div><strong>{u.firstName} {u.lastName}</strong>{self && <span className="vb-demo">You</span>}<div className="vb-muted small">{u.email}</div></div>
                          </div>
                        </td>
                        <td className="vb-nowrap">{formatDate(u.createdAt)}</td>
                        <td>
                          <select className="form-select form-select-sm" aria-label={`Role for ${u.firstName} ${u.lastName}`} value={u.role} disabled={self || busy} onChange={(e) => change(u, { role: e.target.value })}>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-select form-select-sm" aria-label={`Status for ${u.firstName} ${u.lastName}`} value={u.status} disabled={self || busy} onChange={(e) => change(u, { status: e.target.value })}>
                            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
