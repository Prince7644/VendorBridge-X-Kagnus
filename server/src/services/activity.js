const ActivityLog = require('../models/ActivityLog');

// Audit logging must never break the request that triggered it.
async function logActivity({ actor, action, entityType, entityId, message }) {
  try {
    await ActivityLog.create({
      actor: actor ? actor._id : undefined,
      actorName: actor ? actor.fullName || `${actor.firstName} ${actor.lastName}` : 'System',
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      message: message.slice(0, 300),
    });
  } catch (err) {
    console.error('[activity] failed to write log entry:', err.message);
  }
}

module.exports = { logActivity };
