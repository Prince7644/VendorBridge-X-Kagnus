import { Link } from 'react-router-dom';
import { Activity, Building2, FileText, Plus, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/dashboardApi';
import useFetch from '../hooks/useFetch';
import { timeAgo } from '../utils/format';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';
import Notice from '../components/Notice';
import EmptyState from '../components/EmptyState';

const STATUS_ORDER = ['Active', 'Pending', 'Inactive', 'Blocked'];

function VendorStatusPanel({ byStatus }) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + byStatus[s], 0);
  return (
    <section className="vb-panel" aria-labelledby="status-heading">
      <h2 id="status-heading" className="vb-panel-title">Vendors by status</h2>
      {total === 0 ? (
        <EmptyState icon={Building2} title="No vendors yet">Add your first vendor to see the breakdown here.</EmptyState>
      ) : (
        <ul className="vb-bars">
          {STATUS_ORDER.map((s) => (
            <li key={s}>
              <div className="vb-bar-head"><StatusBadge status={s} /><span>{byStatus[s]}</span></div>
              <div className="vb-bar" role="img" aria-label={`${s}: ${byStatus[s]} of ${total} vendors`}>
                <span className={`vb-bar-fill vb-bar-${s.toLowerCase()}`} style={{ width: `${(byStatus[s] / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityPanel({ items }) {
  return (
    <section className="vb-panel" aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="vb-panel-title">Recent activity</h2>
      {items.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet">Adding, updating or approving vendors will show up here.</EmptyState>
      ) : (
        <ul className="vb-activity">
          {items.map((a) => (
            <li key={a.id}>
              <span>{a.message}</span>
              <time dateTime={a.createdAt} className="vb-muted">{timeAgo(a.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const { data, loading, error, reload } = useFetch(() => dashboardApi.summary(), []);

  return (
    <div>
      <div className="vb-page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="vb-muted">Welcome back, {user.firstName} - {user.role}, today&apos;s overview</p>
        </div>
      </div>

      {error && <Notice type="error" onRetry={reload}>{error}</Notice>}
      {loading && !data && <Loader label="Loading dashboard" />}

      {data?.scope === 'own' && (
        <section className="vb-panel" aria-labelledby="own-heading">
          <h2 id="own-heading" className="vb-panel-title">Your vendor profile</h2>
          {data.ownVendor ? (
            <dl className="vb-dl">
              <div><dt>Company</dt><dd>{data.ownVendor.vendorName}</dd></div>
              <div><dt>Category</dt><dd>{data.ownVendor.category}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={data.ownVendor.status} /></dd></div>
            </dl>
          ) : (
            <EmptyState icon={Building2} title="No vendor profile linked yet">
              The procurement team links your account to your company record. Contact them if this is unexpected.
            </EmptyState>
          )}
        </section>
      )}

      {data?.scope === 'all' && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3"><StatCard label="Active vendors" value={data.cards.activeVendors.value} hint="Approved and available" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Pending approvals" value={data.cards.pendingApprovals.value} hint="Vendor registrations to review" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Procurement spend" value="-" muted hint="Appears once purchase orders launch" /></div>
            <div className="col-6 col-lg-3"><StatCard label="Purchase orders" value="-" muted hint="Appears once purchase orders launch" /></div>
          </div>
          <div className="row g-3 mb-4">
            <div className="col-lg-7"><ActivityPanel items={data.recentActivity} /></div>
            <div className="col-lg-5"><VendorStatusPanel byStatus={data.vendorsByStatus} /></div>
          </div>
        </>
      )}

      {data && (
        <section aria-labelledby="quick-heading" className="vb-quick">
          <h2 id="quick-heading" className="vb-panel-title">Quick actions</h2>
          <div className="vb-quick-actions">
            {can('vendor:create') && <Link className="btn btn-primary" to="/vendors?add=1"><Plus size={16} aria-hidden="true" /> Add vendor</Link>}
            {can('vendor:read') && <Link className="btn btn-outline-secondary" to="/vendors"><Building2 size={16} aria-hidden="true" /> View vendors</Link>}
            {can('vendor:approve') && <Link className="btn btn-outline-secondary" to="/vendors?status=Pending">Review pending vendors</Link>}
            <Link className="btn btn-outline-secondary" to="/rfqs"><FileText size={16} aria-hidden="true" /> New RFQ <small className="vb-soon">Soon</small></Link>
            <Link className="btn btn-outline-secondary" to="/invoices"><Receipt size={16} aria-hidden="true" /> View invoices <small className="vb-soon">Soon</small></Link>
          </div>
        </section>
      )}
    </div>
  );
}
