import { useState } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import Notice from '../Notice';
import { vendorApi } from '../../services/vendorApi';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { isIndia, validateVendor } from '../../utils/validation';
import { COUNTRIES } from '../../utils/countries';

export const CATEGORIES = ['IT Hardware', 'Furniture', 'Stationery', 'Logistics', 'Construction', 'Services', 'Other'];
export const STATUSES = ['Pending', 'Active', 'Inactive', 'Blocked'];

const blank = { vendorName: '', category: '', gstNumber: '', contactPerson: '', email: '', phone: '', address: '', country: 'India', status: 'Pending', additionalInformation: '', portalUserEmail: '' };

const fromVendor = (v) => ({
  vendorName: v.vendorName, category: v.category, gstNumber: v.gstNumber || '', contactPerson: v.contactPerson,
  email: v.email, phone: v.phone, address: v.address, country: v.country, status: v.status,
  additionalInformation: v.additionalInformation || '', portalUserEmail: '',
});

// mode: create | edit | status (Manager/Approver may change status only)
export default function VendorForm({ vendor, mode, canApprove, onClose, onSaved }) {
  const [values, setValues] = useState(vendor ? fromVendor(vendor) : blank);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const statusOnly = mode === 'status';
  const title = mode === 'create' ? 'Add vendor' : statusOnly ? `Change status - ${vendor.vendorName}` : `Edit vendor - ${vendor.vendorName}`;

  const set = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  // Officers cannot move vendors into / out of Active or Blocked (approver decision).
  const statusOptions = canApprove ? STATUSES : STATUSES.filter((s) => s === 'Pending' || s === 'Inactive');
  const lockedStatus = !canApprove && (vendor?.status === 'Active' || vendor?.status === 'Blocked');

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!statusOnly) {
      const found = validateVendor(values);
      setErrors(found);
      if (Object.keys(found).length) return;
    }
    setSaving(true);
    try {
      let res;
      if (statusOnly) res = await vendorApi.update(vendor.id, { status: values.status });
      else if (mode === 'create') res = await vendorApi.create(values);
      else res = await vendorApi.update(vendor.id, values);
      onSaved(res.message);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const lock = statusOnly;
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="lg"
      busy={saving}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="vendor-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create vendor' : 'Save changes'}
          </button>
        </>
      }
    >
      {formError && <Notice type="error">{formError}</Notice>}
      <form id="vendor-form" onSubmit={submit} noValidate>
        <div className="row g-3">
          <div className="col-md-8"><FormInput label="Vendor name" name="vendorName" required disabled={lock} maxLength={120} value={values.vendorName} onChange={set} error={errors.vendorName} /></div>
          <div className="col-md-4">
            <FormInput as="select" label="Category" name="category" required disabled={lock} value={values.category} onChange={set} error={errors.category}>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </FormInput>
          </div>
          <div className="col-md-6">
            <FormInput label="Country" name="country" list="vendor-countries" required disabled={lock} value={values.country} onChange={set} error={errors.country} />
            <datalist id="vendor-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="col-md-6">
            <FormInput
              label={isIndia(values.country) ? 'GSTIN' : 'GST / Tax ID'}
              name="gstNumber" disabled={lock} maxLength={30} value={values.gstNumber} onChange={set} error={errors.gstNumber}
              hint={isIndia(values.country) ? 'Optional. 15 characters, e.g. 27AABCS1429B1Z5' : 'Optional. VAT, EIN or the local tax identifier'}
            />
          </div>
          <div className="col-md-6"><FormInput label="Contact person" name="contactPerson" required disabled={lock} value={values.contactPerson} onChange={set} error={errors.contactPerson} /></div>
          <div className="col-md-6"><FormInput label="Contact email" name="email" type="email" required disabled={lock} value={values.email} onChange={set} error={errors.email} /></div>
          <div className="col-md-6"><FormInput label="Contact phone" name="phone" type="tel" required disabled={lock} value={values.phone} onChange={set} error={errors.phone} /></div>
          <div className="col-md-6">
            <FormInput as="select" label="Status" name="status" disabled={lockedStatus && !statusOnly} value={values.status} onChange={set} error={errors.status}
              hint={canApprove ? undefined : 'Only a Manager/Approver or Admin can activate or block a vendor.'}>
              {(statusOptions.includes(values.status) ? statusOptions : [values.status, ...statusOptions]).map((s) => <option key={s} value={s}>{s}</option>)}
            </FormInput>
          </div>
          <div className="col-12"><FormInput as="textarea" rows={2} label="Address" name="address" required disabled={lock} maxLength={300} value={values.address} onChange={set} error={errors.address} /></div>
          <div className="col-12"><FormInput as="textarea" rows={2} label="Additional information" name="additionalInformation" disabled={lock} maxLength={1000} value={values.additionalInformation} onChange={set} error={errors.additionalInformation} /></div>
          {!statusOnly && (
            <div className="col-12">
              <FormInput label="Vendor portal user email" name="portalUserEmail" type="email" value={values.portalUserEmail} onChange={set} error={errors.portalUserEmail}
                hint="Optional. Links this record to a registered user with the Vendor role so they can view it." />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
