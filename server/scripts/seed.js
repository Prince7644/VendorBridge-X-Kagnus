// DEVELOPMENT SEED DATA ONLY. Creates demo users and demo vendors so the UI can
// be explored. Demo vendors are flagged isDemo=true and labelled "[DEMO DATA]".
// Safe to re-run (idempotent); never deletes existing records; refuses to run
// in production.
const config = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const { ROLES } = require('../src/config/constants');

if (config.isProd) {
  console.error('Refusing to seed demo data in production.');
  process.exit(1);
}

const PASSWORD = process.env.SEED_PASSWORD || 'Demo@12345';
const users = [
  ['Asha', 'Admin', 'admin@vendorbridge.demo', ROLES.ADMIN],
  ['Rahul', 'Mehta', 'manager@vendorbridge.demo', ROLES.MANAGER],
  ['Priya', 'Shah', 'officer@vendorbridge.demo', ROLES.OFFICER],
  ['Vikram', 'Rao', 'vendor@vendorbridge.demo', ROLES.VENDOR],
];

const demoVendors = [
  ['Infra Supplies Pvt Ltd', 'Construction', '24AAACI1234A1Z5', 'Anil Kumar', 'sales@infra-supplies.example', '+91 98250 11111', '456 Industrial Estate, Surat', 'India', 'Active'],
  ['Tech Core Ltd', 'IT Hardware', '27AABCT5678B1Z3', 'Neha Joshi', 'accounts@techcore.example', '+91 98250 22222', '12 Tech Park, Pune', 'India', 'Active'],
  ['FastLog Transport', 'Logistics', '29AAAFF9012C1Z7', 'Sameer Khan', 'ops@fastlog.example', '+91 98250 33333', '8 Cargo Road, Bengaluru', 'India', 'Blocked'],
  ['Office Head Co.', 'Furniture', '24AAACO3456D1Z9', 'Meera Patel', 'hello@officehead.example', '+91 98250 44444', '77 Furniture Market, Ahmedabad', 'India', 'Active'],
  ['PaperTrail Stationers', 'Stationery', '', 'Rohit Sen', 'orders@papertrail.example', '+91 98250 55555', '5 Press Lane, Kolkata', 'India', 'Pending'],
  ['Northwind Services', 'Services', 'GB123456789', 'Helen Brooks', 'contact@northwind.example', '+44 20 7946 0000', '1 Canary Wharf, London', 'United Kingdom', 'Pending'],
  ['Greenline Builders', 'Construction', '', 'Imran Ali', 'info@greenline.example', '+91 98250 66666', '90 Ring Road, Jaipur', 'India', 'Inactive'],
  ['ByteBox Computers', 'IT Hardware', '07AAACB7890E1Z2', 'Tanya Gill', 'sales@bytebox.example', '+91 98250 77777', '21 Nehru Place, Delhi', 'India', 'Pending'],
];

(async () => {
  await connectDB(config.mongoUri);
  const passwordHash = await User.hashPassword(PASSWORD);
  const created = {};
  for (const [firstName, lastName, email, role] of users) {
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({ firstName, lastName, email, phone: '+91 90000 00000', country: 'India', additionalInformation: '[DEMO DATA]', passwordHash, role, status: 'active' });
      console.log(`created demo user ${email}`);
    }
    created[role] = u;
  }
  for (const [vendorName, category, gstNumber, contactPerson, email, phone, address, country, status] of demoVendors) {
    if (await Vendor.exists({ nameKey: Vendor.normaliseName(vendorName) })) continue;
    await Vendor.create({
      vendorName, category, gstNumber: gstNumber || undefined, contactPerson, email, phone, address, country, status,
      additionalInformation: '[DEMO DATA] Seeded for development.',
      isDemo: true,
      createdBy: created[ROLES.OFFICER]._id,
      linkedUser: vendorName === 'Infra Supplies Pvt Ltd' ? created[ROLES.VENDOR]._id : undefined,
    });
    console.log(`created demo vendor ${vendorName}`);
  }
  console.log(`\nDemo logins (password: ${PASSWORD}):`);
  users.forEach(([, , email, role]) => console.log(`  ${role.padEnd(20)} ${email}`));
  await disconnectDB();
})().catch((e) => { console.error(e); process.exit(1); });
