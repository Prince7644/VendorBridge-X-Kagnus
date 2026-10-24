// Usage: ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='StrongPass123' npm run create-admin
// Creates (or promotes) an Admin account. This is the authorised way to
// provision the first Admin - public registration can never create one.
const config = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const { ROLES } = require('../src/config/constants');

(async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 8) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters, with a letter and a number).');
    process.exit(1);
  }
  await connectDB(config.mongoUri);
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = ROLES.ADMIN;
    existing.status = 'active';
    await existing.save();
    console.log(`Existing user ${email} promoted to Admin.`);
  } else {
    await User.create({
      firstName: process.env.ADMIN_FIRST_NAME || 'System',
      lastName: process.env.ADMIN_LAST_NAME || 'Admin',
      email,
      phone: process.env.ADMIN_PHONE || '+910000000000',
      country: process.env.ADMIN_COUNTRY || 'India',
      passwordHash: await User.hashPassword(password),
      role: ROLES.ADMIN,
      status: 'active',
    });
    console.log(`Admin ${email} created.`);
  }
  await disconnectDB();
})().catch((e) => { console.error(e.message); process.exit(1); });
