const Vendor = require('../models/Vendor');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler, ok } = require('../utils/helpers');
const { can } = require('../config/permissions');
const { VENDOR_STATUS } = require('../config/constants');

// Every figure comes from the database. Spend and purchase orders belong to
// later weeks, so they are reported as "not available yet" with a zero value.
const summary = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!can(user.role, 'vendor:read:all')) {
    // Vendor role: only their own linked vendor profile.
    const own = await Vendor.findOne({ linkedUser: user._id, archivedAt: null });
    return ok(res, {
      scope: 'own',
      ownVendor: own ? { vendorName: own.vendorName, status: own.status, category: own.category } : null,
    });
  }

  const live = { archivedAt: null };
  const [statusGroups, categoryGroups, activity] = await Promise.all([
    Vendor.aggregate([{ $match: live }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Vendor.aggregate([{ $match: live }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
    can(user.role, 'activity:view') ? ActivityLog.find().sort({ createdAt: -1 }).limit(8) : Promise.resolve([]),
  ]);

  const vendorsByStatus = Object.fromEntries(VENDOR_STATUS.map((s) => [s, 0]));
  statusGroups.forEach((g) => { vendorsByStatus[g._id] = g.count; });

  return ok(res, {
    scope: 'all',
    cards: {
      activeVendors: { value: vendorsByStatus.Active },
      pendingApprovals: { value: vendorsByStatus.Pending, source: 'vendor registrations awaiting approval' },
      procurementSpend: { value: 0, available: false, availableFrom: 'a later release (Purchase Orders & Invoices)' },
      purchaseOrders: { value: 0, available: false, availableFrom: 'a later release (Purchase Orders & Invoices)' },
    },
    vendorsByStatus,
    vendorsByCategory: categoryGroups.map((g) => ({ category: g._id, count: g.count })),
    recentActivity: activity.map((a) => ({ id: a.id, message: a.message, action: a.action, createdAt: a.createdAt })),
  });
});

module.exports = { summary };
