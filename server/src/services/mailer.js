const nodemailer = require('nodemailer');
const config = require('../config/env');

// In tests, messages are captured here instead of being sent.
const outbox = [];
let transporter;

async function sendMail({ to, subject, text, html }) {
  if (config.isTest) {
    outbox.push({ to, subject, text });
    return;
  }
  if (!config.email.host) {
    if (config.isProd) {
      console.warn('[mail] EMAIL_HOST is not configured - email was NOT sent.');
    } else {
      // Development fallback: print to the server console only (never to the browser).
      console.log(`\n[DEV EMAIL - SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    }
    return;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: config.email.user ? { user: config.email.user, pass: config.email.password } : undefined,
    });
  }
  await transporter.sendMail({ from: config.email.from, to, subject, text, html });
}

async function sendPasswordResetEmail(user, resetUrl) {
  const minutes = config.resetTokenTtlMinutes;
  const text =
    `Hello ${user.firstName},\n\nWe received a request to reset your VendorBridge password.\n` +
    `Use the link below within ${minutes} minutes. It can only be used once.\n\n${resetUrl}\n\n` +
    'If you did not request this, you can ignore this email - your password will not change.';
  const html =
    `<p>Hello ${user.firstName},</p><p>We received a request to reset your VendorBridge password. ` +
    `This link works for ${minutes} minutes and can only be used once.</p>` +
    `<p><a href="${resetUrl}">Reset your password</a></p>` +
    '<p>If you did not request this, you can ignore this email.</p>';
  await sendMail({ to: user.email, subject: 'Reset your VendorBridge password', text, html });
}

module.exports = { sendMail, sendPasswordResetEmail, outbox };
