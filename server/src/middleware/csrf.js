const crypto = require('crypto');
const AppError = require('../utils/AppError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Synchroniser-token CSRF protection layered on top of SameSite=Lax cookies.
// The token lives in the server-side session and must be echoed in a header.
const verifyCsrf = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const expected = req.session && req.session.csrfToken;
  const given = req.get('x-csrf-token');
  const valid =
    expected &&
    given &&
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!valid) return next(new AppError(403, 'CSRF_INVALID', 'Security token missing or invalid. Please refresh and try again.'));
  return next();
};

module.exports = { verifyCsrf };
