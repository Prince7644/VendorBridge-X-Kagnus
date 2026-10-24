// Client-side mirrors of the server rules (the server remains the authority).
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[0-9()\s-]{7,20}$/;
const INDIA_GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GENERIC_TAX_ID = /^[A-Za-z0-9][A-Za-z0-9\-/. ]{2,28}[A-Za-z0-9]$/;

export const isIndia = (country) => String(country || '').trim().toLowerCase() === 'india';

export function validatePassword(pw) {
  if (!pw) return 'Password is required';
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(pw)) return 'Password must include a letter';
  if (!/\d/.test(pw)) return 'Password must include a number';
  return '';
}

export function validateVendor(v) {
  const e = {};
  if (v.vendorName.trim().length < 2) e.vendorName = 'Vendor name must be at least 2 characters';
  if (!v.category) e.category = 'Select a category';
  if (v.contactPerson.trim().length < 2) e.contactPerson = 'Contact person is required';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address';
  if (!PHONE_RE.test(v.phone.trim())) e.phone = 'Enter a valid phone number';
  if (v.address.trim().length < 5) e.address = 'Address must be at least 5 characters';
  if (v.country.trim().length < 2) e.country = 'Country is required';
  const gst = v.gstNumber.trim();
  if (gst) {
    if (isIndia(v.country) && !INDIA_GSTIN.test(gst.replace(/[\s-]/g, '').toUpperCase())) e.gstNumber = 'Enter a valid 15-character GSTIN (e.g. 27AABCS1429B1Z5)';
    else if (!isIndia(v.country) && !GENERIC_TAX_ID.test(gst)) e.gstNumber = 'Tax ID must be 4-30 letters, numbers, spaces, dashes or slashes';
  }
  if (v.portalUserEmail.trim() && !EMAIL_RE.test(v.portalUserEmail.trim())) e.portalUserEmail = 'Enter a valid email address';
  return e;
}
