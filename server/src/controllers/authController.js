const bcrypt = require('bcryptjs');
const config = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { asyncHandler, ok, created, randomToken, sha256 } = require('../utils/helpers');
const { regenerateSession, destroySession, saveSession } = require('../utils/session');
const { permissionsFor } = require('../config/permissions');
const { ROLES } = require('../config/constants');
const { sendPasswordResetEmail } = require('../services/mailer');
const { logActivity } = require('../services/activity');

// Compared against when the email is unknown so response time does not reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptRounds);

const sessionPayload = (user) => ({ user, permissions: permissionsFor(user.role) });

const csrf = asyncHandler(async (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomToken(24);
    await saveSession(req);
  }
  return ok(res, { csrfToken: req.session.csrfToken });
});

const register = asyncHandler(async (req, res) => {
  const d = req.valid.body;
  if (await User.exists({ email: d.email })) {
    throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists.', [
      { field: 'email', message: 'An account with this email already exists.' },
    ]);
  }
  const passwordHash = await User.hashPassword(d.password);
  const needsApproval = d.role !== ROLES.VENDOR;
  const user = await User.create({
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    phone: d.phone,
    country: d.country,
    additionalInformation: d.additionalInformation,
    avatar: d.avatar,
    passwordHash,
    role: d.role,
    // Staff accounts must be approved by an Admin before they can sign in.
    status: needsApproval ? 'pending' : 'active',
  });
  await logActivity({ actor: user, action: 'user.registered', entityType: 'User', entityId: user.id, message: `${user.fullName} registered as ${user.role}` });
  return created(res, { user }, {
    message: needsApproval
      ? 'Registration received. An administrator must approve your Procurement Officer account before you can sign in.'
      : 'Registration successful. You can now sign in.',
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const match = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !match) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  if (user.status === 'pending') {
    throw new AppError(403, 'ACCOUNT_PENDING', 'Your account is awaiting administrator approval.');
  }
  if (user.status === 'disabled') {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled. Contact an administrator.');
  }

  // New session id on login prevents session fixation.
  await regenerateSession(req);
  req.session.userId = user.id;
  req.session.tokenVersion = user.tokenVersion;
  req.session.csrfToken = randomToken(24);
  await saveSession(req);
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  const safeUser = await User.findById(user._id);
  return ok(res, { ...sessionPayload(safeUser), csrfToken: req.session.csrfToken }, { message: 'Signed in successfully.' });
});

const logout = asyncHandler(async (req, res) => {
  await destroySession(req);
  res.clearCookie('vb.sid', { httpOnly: true, sameSite: 'lax', secure: config.isProd });
  return ok(res, null, { message: 'Signed out.' });
});

const me = (req, res) => ok(res, sessionPayload(req.user));

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.valid.body;
  const user = await User.findOne({ email });
  if (user && user.status !== 'disabled') {
    const token = randomToken(32);
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordReset: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + config.resetTokenTtlMinutes * 60 * 1000) } } }
    );
    // Not awaited: response time must not depend on whether the account exists.
    sendPasswordResetEmail(user, `${config.clientUrl}/reset-password?token=${token}`).catch((e) =>
      console.error('[mail] failed to send reset email:', e.message)
    );
  }
  // Identical response whether or not the account exists.
  return ok(res, null, { message: 'If an account exists for that email, a password reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.valid.body;
  const tokenHash = sha256(token);
  const validToken = { 'passwordReset.tokenHash': tokenHash, 'passwordReset.expiresAt': { $gt: new Date() } };
  const invalid = () => new AppError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or has expired. Please request a new one.');

  const user = await User.findOne(validToken);
  if (!user) throw invalid();

  // The update only matches while the token is still stored and unexpired, and
  // it clears the token in the same operation, so a token can never be used
  // twice - even by two simultaneous requests.
  const passwordHash = await User.hashPassword(password);
  const result = await User.updateOne(
    { _id: user._id, ...validToken },
    { $set: { passwordHash }, $unset: { passwordReset: 1 }, $inc: { tokenVersion: 1 } }
  );
  if (result.modifiedCount !== 1) throw invalid();
  await logActivity({ actor: user, action: 'auth.password_reset', entityType: 'User', entityId: user.id, message: `${user.fullName} reset their password` });
  return ok(res, null, { message: 'Password updated. Please sign in with your new password.' });
});

module.exports = { csrf, register, login, logout, me, forgotPassword, resetPassword };
