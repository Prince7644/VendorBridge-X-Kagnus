// Centralised permission policy. Every protected route asks this module -
// never compare role strings inside controllers or routes.
const { ROLES } = require('./constants');

const { ADMIN, MANAGER, OFFICER, VENDOR } = ROLES;

const POLICY = Object.freeze({
  'dashboard:view': [ADMIN, MANAGER, OFFICER, VENDOR],
  'activity:view': [ADMIN, MANAGER, OFFICER],
  'spend:view': [ADMIN, MANAGER, OFFICER],
  'vendor:read': [ADMIN, MANAGER, OFFICER, VENDOR], // Vendor role: own linked record only
  'vendor:read:all': [ADMIN, MANAGER, OFFICER],
  'vendor:create': [ADMIN, OFFICER],
  'vendor:update': [ADMIN, OFFICER],
  'vendor:approve': [ADMIN, MANAGER], // set / change Active and Blocked status
  'vendor:archive': [ADMIN, OFFICER],
  'users:manage': [ADMIN],
});

const can = (role, permission) => Boolean(POLICY[permission] && POLICY[permission].includes(role));

const permissionsFor = (role) => Object.keys(POLICY).filter((p) => can(role, p));

module.exports = { POLICY, can, permissionsFor };
