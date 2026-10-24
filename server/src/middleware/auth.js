const User = require('../models/User');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/helpers');
const { destroySession } = require('../utils/session');
const { can } = require('../config/permissions');

// Authenticates the session on every request and re-loads the user, so role
// changes, disabled accounts and password resets take effect immediately.
const requireAuth = asyncHandler(async (req, res, next) => {
  const userId = req.session && req.session.userId;
  if (!userId) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');

  const user = await User.findById(userId);
  const valid = user && user.status === 'active' && user.tokenVersion === req.session.tokenVersion;
  if (!valid) {
    await destroySession(req).catch(() => {});
    throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  }
  req.user = user;
  return next();
});

// Allows the request when the user holds ANY of the listed permissions.
const requirePermission = (...permissions) => (req, res, next) => {
  const allowed = permissions.some((p) => can(req.user.role, p));
  if (!allowed) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
  }
  return next();
};

module.exports = { requireAuth, requirePermission };
