const User = require('../models/User');
const AppError = require('../utils/AppError');
const { asyncHandler, ok, escapeRegex } = require('../utils/helpers');
const { logActivity } = require('../services/activity');

const list = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const filter = {};
  if (q.role) filter.role = q.role;
  if (q.status) filter.status = q.status;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = ['firstName', 'lastName', 'email'].map((f) => ({ [f]: rx }));
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    User.countDocuments(filter),
  ]);
  return ok(res, { items, pagination: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) } });
});

// Only an Admin can grant roles or approve / disable accounts.
const update = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot change your own role or status.');
  }
  const target = await User.findById(req.params.id);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'User not found.');
  const { role, status } = req.valid.body;
  const before = `${target.role}/${target.status}`;
  if (role) target.role = role;
  if (status) target.status = status;
  await target.save();
  await logActivity({ actor: req.user, action: 'user.updated', entityType: 'User', entityId: target.id, message: `${req.user.fullName} changed ${target.fullName} from ${before} to ${target.role}/${target.status}` });
  return ok(res, { user: target }, { message: 'User updated.' });
});

module.exports = { list, update };
