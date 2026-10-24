const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const config = {
  nodeEnv,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendorbridge',
  sessionSecret: process.env.SESSION_SECRET || (isProd ? '' : 'dev-only-insecure-secret-change-me'),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS) || 8,
  // 'native' = MongoDB TTL index (default, recommended). 'interval' = app-side cleanup,
  // for MongoDB-compatible servers without TTL support.
  sessionAutoRemove: process.env.SESSION_AUTO_REMOVE === 'interval' ? 'interval' : 'native',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  bcryptRounds: isTest ? 4 : 12,
  resetTokenTtlMinutes: Number(process.env.RESET_TOKEN_TTL_MINUTES) || 30,
  authRateLimit: {
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || (isTest ? 1000 : 20),
  },
  email: {
    host: process.env.EMAIL_HOST || '',
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'VendorBridge <no-reply@vendorbridge.local>',
  },
};

if (isProd) {
  if (config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters in production.');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be set in production.');
}

module.exports = config;
