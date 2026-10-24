const ROLES = Object.freeze({
  OFFICER: 'Procurement Officer',
  VENDOR: 'Vendor',
  MANAGER: 'Manager/Approver',
  ADMIN: 'Admin',
});

// Roles a member of the public may choose at registration. Admin and
// Manager/Approver can only be granted by an Admin (or the create-admin script).
const PUBLIC_REGISTRATION_ROLES = [ROLES.VENDOR, ROLES.OFFICER];

const USER_STATUS = ['active', 'pending', 'disabled'];

const VENDOR_STATUS = ['Pending', 'Active', 'Inactive', 'Blocked'];
// Moving a vendor into or out of these requires the vendor:approve permission.
const APPROVER_ONLY_STATUS = ['Active', 'Blocked'];

const VENDOR_CATEGORIES = [
  'IT Hardware',
  'Furniture',
  'Stationery',
  'Logistics',
  'Construction',
  'Services',
  'Other',
];

module.exports = {
  ROLES,
  PUBLIC_REGISTRATION_ROLES,
  USER_STATUS,
  VENDOR_STATUS,
  APPROVER_ONLY_STATUS,
  VENDOR_CATEGORIES,
};
