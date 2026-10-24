const crypto = require('crypto');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const ok = (res, data, extra = {}) => res.status(200).json({ success: true, data, ...extra });
const created = (res, data, extra = {}) => res.status(201).json({ success: true, data, ...extra });

module.exports = { asyncHandler, escapeRegex, sha256, randomToken, ok, created };
