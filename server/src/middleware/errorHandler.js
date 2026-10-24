const { ZodError } = require('zod');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const config = require('../config/env');

const DUPLICATE_MESSAGES = {
  email: { field: 'email', message: 'An account with this email already exists.' },
  nameKey: { field: 'vendorName', message: 'A vendor with this name already exists.' },
  gstKey: { field: 'gstNumber', message: 'A vendor with this GST / Tax ID already exists.' },
};

const notFound = (req, res, next) => next(new AppError(404, 'NOT_FOUND', 'The requested endpoint does not exist.'));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = 500;
  let code = 'SERVER_ERROR';
  let message = 'Something went wrong on our side. Please try again.';
  let details;

  if (err instanceof AppError) {
    ({ status, errorCode: code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Please correct the highlighted fields.';
    details = err.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Please correct the highlighted fields.';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'INVALID_ID';
    message = 'The supplied record ID is not valid.';
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    const key = Object.keys(err.keyPattern || {})[0] || Object.keys(DUPLICATE_MESSAGES).find((k) => String(err.message).includes(k));
    const known = DUPLICATE_MESSAGES[key];
    message = known ? known.message : 'A record with these details already exists.';
    details = known ? [{ field: known.field, message: known.message }] : undefined;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'The request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'The request is too large.';
  } else if (/ServerSelection|MongoNetwork|MongooseServerSelection/.test(err.name || '')) {
    status = 503;
    code = 'DB_UNAVAILABLE';
    message = 'The database is currently unavailable. Please try again shortly.';
  }

  if (status >= 500 && !config.isTest) {
    // Log server-side only; never return stack traces to the client.
    console.error(`[error] ${req.method} ${req.originalUrl}`, config.isProd ? err.message : err);
  }

  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
};

module.exports = { errorHandler, notFound };
