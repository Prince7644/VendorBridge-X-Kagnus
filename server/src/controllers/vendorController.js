const Vendor = require('../models/Vendor');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { asyncHandler, ok, created, escapeRegex } = require('../utils/helpers');
const { can } = require('../config/permissions');
const { ROLES, VENDOR_STATUS, APPROVER_ONLY_STATUS } = require('../config/constants');
const { logActivity } = require('../services/activity');
const { vendorHasReferences } = require('../services/vendorReferences');
const { vendorBody, statusOnlyBody } = require('../validators/vendor.validators');

const SORTS = { newest: { createdAt: -1, _id: -1 }, oldest: { createdAt: 1, _id: 1 }, name: { nameKey: 1 } };
const SEARCH_FIELDS = ['vendorName', 'contactPerson', 'email', 'phone', 'gstNumber', 'category'];

// Record-level access: Vendor-role users only ever see the record linked to them.
const scopeFor = (user) => (can(user.role, 'vendor:read:all') ? {} : { linkedUser: user._id });

const present = (vendor, user) => {
  const obj = vendor.toJSON();
  if (!can(user.role, 'vendor:read:all')) {
    ['createdBy', 'updatedBy', 'linkedUser', 'archivedBy', 'isDemo'].forEach((k) => delete obj[k]);
  } else if (obj.createdBy && obj.createdBy.firstName) {
    obj.createdBy = { id: String(obj.createdBy._id || obj.createdBy.id), name: `${obj.createdBy.firstName} ${obj.createdBy.lastName}` };
  }
  return obj;
};

async function findScoped(req) {
  const vendor = await Vendor.findOne({ _id: req.params.id, archivedAt: null, ...scopeFor(req.user) }).populate('createdBy', 'firstName lastName');
  if (!vendor) throw new AppError(404, 'NOT_FOUND', 'Vendor not found.');
  return vendor;
}

function assertStatusChangeAllowed(user, from, to) {
  if (!to || from === to) return;
  const touchesApproverStatus = APPROVER_ONLY_STATUS.includes(to) || APPROVER_ONLY_STATUS.includes(from);
  if (touchesApproverStatus && !can(user.role, 'vendor:approve')) {
    throw new AppError(403, 'FORBIDDEN', 'Only a Manager/Approver or Admin can activate or block a vendor.');
  }
}

async function assertUnique({ vendorName, gstNumber }, excludeId) {
  const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};
  if (await Vendor.exists({ nameKey: Vendor.normaliseName(vendorName), ...notSelf })) {
    throw new AppError(409, 'DUPLICATE', 'A vendor with this name already exists.', [{ field: 'vendorName', message: 'A vendor with this name already exists.' }]);
  }
  if (gstNumber && (await Vendor.exists({ gstKey: Vendor.normaliseGst(gstNumber), ...notSelf }))) {
    throw new AppError(409, 'DUPLICATE', 'A vendor with this GST / Tax ID already exists.', [{ field: 'gstNumber', message: 'A vendor with this GST / Tax ID already exists.' }]);
  }
}

async function resolvePortalUser(email) {
  if (!email) return undefined;
  const portalUser = await User.findOne({ email, role: ROLES.VENDOR });
  if (!portalUser) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', [
      { field: 'portalUserEmail', message: 'No user with the Vendor role has this email.' },
    ]);
  }
  return portalUser._id;
}

const list = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const base = { archivedAt: null, ...scopeFor(req.user) };
  if (q.category) base.category = q.category;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    base.$or = SEARCH_FIELDS.map((f) => ({ [f]: rx }));
  }
  const filter = q.status ? { ...base, status: q.status } : base;

  const [items, total, grouped] = await Promise.all([
    Vendor.find(filter).sort(SORTS[q.sort]).skip((q.page - 1) * q.limit).limit(q.limit).populate('createdBy', 'firstName lastName'),
    Vendor.countDocuments(filter),
    // Status counts honour search + category, but not the status filter itself.
    Vendor.aggregate([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const counts = Object.fromEntries(VENDOR_STATUS.map((s) => [s, 0]));
  grouped.forEach((g) => { counts[g._id] = g.count; });
  counts.All = Object.values(counts).reduce((a, b) => a + b, 0);

  return ok(res, {
    items: items.map((v) => present(v, req.user)),
    pagination: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) },
    counts,
  });
});

const getOne = asyncHandler(async (req, res) => ok(res, { vendor: present(await findScoped(req), req.user) }));

const create = asyncHandler(async (req, res) => {
  const { portalUserEmail, status, ...fields } = req.valid.body;
  const finalStatus = status || 'Pending';
  assertStatusChangeAllowed(req.user, 'Pending', finalStatus);
  await assertUnique(fields);
  const linkedUser = await resolvePortalUser(portalUserEmail);

  const vendor = await Vendor.create({ ...fields, status: finalStatus, linkedUser, createdBy: req.user._id, updatedBy: req.user._id });
  await logActivity({ actor: req.user, action: 'vendor.created', entityType: 'Vendor', entityId: vendor.id, message: `${req.user.fullName} added vendor "${vendor.vendorName}"` });
  const fresh = await Vendor.findById(vendor._id).populate('createdBy', 'firstName lastName');
  return created(res, { vendor: present(fresh, req.user) }, { message: 'Vendor created.' });
});

const update = asyncHandler(async (req, res) => {
  const vendor = await findScoped(req);
  const previousStatus = vendor.status;
  const canEditAll = can(req.user.role, 'vendor:update');

  let changes;
  if (canEditAll) {
    const { portalUserEmail, status, ...fields } = vendorBody.parse(req.body);
    assertStatusChangeAllowed(req.user, previousStatus, status);
    await assertUnique(fields, vendor._id);
    changes = { ...fields, status: status || previousStatus };
    if (portalUserEmail !== undefined) changes.linkedUser = await resolvePortalUser(portalUserEmail);
    // Optional fields omitted from the payload are cleared (PUT = full replace).
    if (!fields.gstNumber) changes.gstNumber = undefined;
    if (!fields.additionalInformation) changes.additionalInformation = '';
  } else {
    // Manager/Approver: status only.
    changes = statusOnlyBody.parse(req.body);
  }

  vendor.set(changes);
  vendor.updatedBy = req.user._id;
  await vendor.save();

  const statusChanged = previousStatus !== vendor.status;
  await logActivity({
    actor: req.user,
    action: statusChanged ? 'vendor.status_changed' : 'vendor.updated',
    entityType: 'Vendor',
    entityId: vendor.id,
    message: statusChanged
      ? `${req.user.fullName} changed "${vendor.vendorName}" from ${previousStatus} to ${vendor.status}`
      : `${req.user.fullName} updated vendor "${vendor.vendorName}"`,
  });
  return ok(res, { vendor: present(vendor, req.user) }, { message: 'Vendor updated.' });
});

// "Delete" archives the vendor (soft delete) so history stays intact.
const archive = asyncHandler(async (req, res) => {
  const vendor = await findScoped(req);
  if (await vendorHasReferences(vendor._id)) {
    throw new AppError(409, 'VENDOR_IN_USE', 'This vendor is referenced by other records and cannot be removed.');
  }
  vendor.archivedAt = new Date();
  vendor.archivedBy = req.user._id;
  vendor.updatedBy = req.user._id;
  await vendor.save();
  await logActivity({ actor: req.user, action: 'vendor.archived', entityType: 'Vendor', entityId: vendor.id, message: `${req.user.fullName} archived vendor "${vendor.vendorName}"` });
  return ok(res, null, { message: 'Vendor archived.' });
});

module.exports = { list, getOne, create, update, archive };
