const mongoose = require('mongoose');
const { VENDOR_STATUS, VENDOR_CATEGORIES } = require('../config/constants');

const vendorSchema = new mongoose.Schema(
  {
    vendorName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    category: { type: String, required: true, enum: VENDOR_CATEGORIES, index: true },
    // GST (India) or the local tax identifier (VAT, EIN, ...). Optional.
    gstNumber: { type: String, trim: true, maxlength: 30 },
    contactPerson: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, minlength: 5, maxlength: 300 },
    country: { type: String, required: true, trim: true, maxlength: 60 },
    status: { type: String, enum: VENDOR_STATUS, default: 'Pending', index: true },
    additionalInformation: { type: String, trim: true, maxlength: 1000, default: '' },

    // Vendor-role user allowed to see this record (record-level access).
    linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Soft delete: vendors will be referenced by RFQs / POs in later weeks.
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Development seed data marker - never set for real records.
    isDemo: { type: Boolean, default: false },

    // Normalised keys used only for uniqueness.
    nameKey: { type: String, required: true, unique: true },
    gstKey: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.nameKey;
        delete ret.gstKey;
        return ret;
      },
    },
  }
);

vendorSchema.index({ createdAt: -1 });
vendorSchema.index({ archivedAt: 1, status: 1, category: 1 });

vendorSchema.statics.normaliseName = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
vendorSchema.statics.normaliseGst = (gst) => String(gst || '').replace(/[\s-]/g, '').toUpperCase();

// Archived vendors release their name / tax ID so they can be re-registered.
vendorSchema.pre('validate', function setKeys(next) {
  const Model = this.constructor;
  const suffix = this.archivedAt ? `#archived:${this._id}` : '';
  if (this.vendorName) this.nameKey = Model.normaliseName(this.vendorName) + suffix;
  this.gstKey = this.gstNumber ? Model.normaliseGst(this.gstNumber) + suffix : undefined;
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);
