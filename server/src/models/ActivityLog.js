const mongoose = require('mongoose');

// Append-only audit trail. No update or delete operations are exposed, and the
// hooks below reject them at the model level.
const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'System' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    message: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ createdAt: -1 });

const blocked = () => {
  throw new Error('Activity log entries are immutable.');
};
['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'replaceOne'].forEach(
  (op) => activitySchema.pre(op, blocked)
);
activitySchema.pre('save', function guard(next) {
  if (!this.isNew) return next(new Error('Activity log entries are immutable.'));
  return next();
});

module.exports = mongoose.model('ActivityLog', activitySchema);
