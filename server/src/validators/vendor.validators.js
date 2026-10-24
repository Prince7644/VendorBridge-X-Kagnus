const { z } = require('zod');
const { VENDOR_STATUS, VENDOR_CATEGORIES } = require('../config/constants');
const { emptyToUndefined } = require('./auth.validators');

const INDIA_GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GENERIC_TAX_ID = /^[A-Za-z0-9][A-Za-z0-9\-/. ]{2,28}[A-Za-z0-9]$/;

const required = (label, min, max) =>
  z.string({ required_error: `${label} is required` }).trim().min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`).max(max, `${label} must be ${max} characters or fewer`);

const vendorFields = z.object({
  vendorName: required('Vendor name', 2, 120),
  category: z.enum(VENDOR_CATEGORIES, { errorMap: () => ({ message: 'Select a valid category' }) }),
  gstNumber: emptyToUndefined(z.string().trim().max(30, 'GST / Tax ID is too long')),
  contactPerson: required('Contact person', 2, 100),
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address').max(254),
  phone: z.string({ required_error: 'Phone number is required' }).trim().regex(/^\+?[0-9()\s-]{7,20}$/, 'Enter a valid phone number'),
  address: required('Address', 5, 300),
  country: required('Country', 2, 60),
  status: z.enum(VENDOR_STATUS, { errorMap: () => ({ message: 'Select a valid status' }) }).optional(),
  additionalInformation: emptyToUndefined(z.string().trim().max(1000, 'Keep additional information under 1000 characters')),
  portalUserEmail: emptyToUndefined(z.string().trim().toLowerCase().email('Enter a valid email address')),
});

// GST is jurisdiction-aware: Indian vendors must supply a valid GSTIN when one
// is given; vendors elsewhere may supply any reasonable tax identifier (VAT, EIN...).
const vendorBody = vendorFields
  .superRefine((d, ctx) => {
    if (!d.gstNumber) return;
    const isIndia = d.country.trim().toLowerCase() === 'india';
    const compact = d.gstNumber.replace(/[\s-]/g, '').toUpperCase();
    if (isIndia && !INDIA_GSTIN.test(compact)) {
      ctx.addIssue({ code: 'custom', path: ['gstNumber'], message: 'Enter a valid 15-character GSTIN (e.g. 27AABCS1429B1Z5)' });
    } else if (!isIndia && !GENERIC_TAX_ID.test(d.gstNumber)) {
      ctx.addIssue({ code: 'custom', path: ['gstNumber'], message: 'Tax ID must be 4-30 letters, numbers, spaces, dashes or slashes' });
    }
  })
  .transform((d) => (d.gstNumber ? { ...d, gstNumber: d.gstNumber.replace(/\s+/g, ' ').toUpperCase() } : d));

// Used by Manager/Approver users, who may change status only.
const statusOnlyBody = z.object({
  status: z.enum(VENDOR_STATUS, { errorMap: () => ({ message: 'Select a valid status' }) }),
});

const listQuery = z.object({
  search: emptyToUndefined(z.string().trim().max(100)),
  category: emptyToUndefined(z.enum(VENDOR_CATEGORIES, { errorMap: () => ({ message: 'Unknown category' }) })),
  status: emptyToUndefined(z.enum(VENDOR_STATUS, { errorMap: () => ({ message: 'Unknown status' }) })),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
});

module.exports = { vendorBody, statusOnlyBody, listQuery };
