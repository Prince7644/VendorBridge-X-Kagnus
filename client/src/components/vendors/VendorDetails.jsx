import { Pencil, Trash2 } from 'lucide-react';
import Modal from '../Modal';
import StatusBadge from '../StatusBadge';
import { formatDate } from '../../utils/format';

export default function VendorDetails({ vendor, canEdit, canChangeStatus, canArchive, onEdit, onArchive, onClose }) {
  const rows = [
    ['Category', vendor.category],
    ['GST / Tax ID', vendor.gstNumber || '-'],
    ['Contact person', vendor.contactPerson],
    ['Email', <a key="e" href={`mailto:${vendor.email}`}>{vendor.email}</a>],
    ['Phone', vendor.phone],
    ['Address', vendor.address],
    ['Country', vendor.country],
    ['Additional information', vendor.additionalInformation || '-'],
    ['Created', formatDate(vendor.createdAt)],
    ['Last updated', formatDate(vendor.updatedAt)],
  ];
  if (vendor.createdBy?.name) rows.push(['Created by', vendor.createdBy.name]);

  return (
    <Modal
      title={vendor.vendorName}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {canArchive && <button type="button" className="btn btn-outline-danger me-auto" onClick={onArchive}><Trash2 size={15} aria-hidden="true" /> Archive</button>}
          {(canEdit || canChangeStatus) && <button type="button" className="btn btn-primary" onClick={onEdit}><Pencil size={15} aria-hidden="true" /> {canEdit ? 'Edit vendor' : 'Change status'}</button>}
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
        </>
      }
    >
      <div className="mb-3"><StatusBadge status={vendor.status} /></div>
      <dl className="vb-dl vb-dl-grid">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </Modal>
  );
}
