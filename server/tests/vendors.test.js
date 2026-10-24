const h = require('./helpers');
const { Vendor } = require('../src/models');
const { disconnectDB, connectDB } = require('../src/config/db');
const mongoose = require('mongoose');

let app;
beforeAll(async () => { await h.startDb(); app = h.createApp(); });
afterAll(h.stopDb);
beforeEach(h.clearDb);

describe('create', () => {
  test('officer creates a vendor (forced to Pending) and it is persisted', async () => {
    const { client, user } = await h.loginAs(app, h.ROLES.OFFICER);
    const res = await client.post('/api/vendors', h.validVendor());
    expect(res.status).toBe(201);
    expect(res.body.data.vendor.status).toBe('Pending');
    const stored = await Vendor.findById(res.body.data.vendor.id);
    expect(stored.vendorName).toBe('Acme Office Supplies');
    expect(String(stored.createdBy)).toBe(String(user._id));
    expect(res.body.data.vendor.nameKey).toBeUndefined();
  });

  test('required fields are validated with per-field messages', async () => {
    const { client } = await h.loginAs(app, h.ROLES.OFFICER);
    const res = await client.post('/api/vendors', { vendorName: 'X' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['vendorName', 'category', 'contactPerson', 'email', 'phone', 'address', 'country']));
  });

  test('GST is jurisdiction-aware and optional', async () => {
    const { client } = await h.loginAs(app, h.ROLES.OFFICER);
    const badIndia = await client.post('/api/vendors', h.validVendor({ gstNumber: 'NOTAGST' }));
    expect(badIndia.status).toBe(400);
    expect(badIndia.body.error.details[0].field).toBe('gstNumber');
    const uk = await client.post('/api/vendors', h.validVendor({ vendorName: 'Northwind Ltd', country: 'United Kingdom', gstNumber: 'GB123456789' }));
    expect(uk.status).toBe(201);
    const none = await client.post('/api/vendors', h.validVendor({ vendorName: 'No Tax Co', gstNumber: '' }));
    expect(none.status).toBe(201);
    const none2 = await client.post('/api/vendors', h.validVendor({ vendorName: 'No Tax Co Two', gstNumber: '' }));
    expect(none2.status).toBe(201);
  });

  test('duplicate vendor name or tax ID is rejected', async () => {
    const { client } = await h.loginAs(app, h.ROLES.OFFICER);
    await client.post('/api/vendors', h.validVendor());
    const sameName = await client.post('/api/vendors', h.validVendor({ vendorName: '  acme   OFFICE supplies ', gstNumber: '' }));
    expect(sameName.status).toBe(409);
    const sameGst = await client.post('/api/vendors', h.validVendor({ vendorName: 'Different Name' }));
    expect(sameGst.status).toBe(409);
    expect(sameGst.body.error.details[0].field).toBe('gstNumber');
  });

  test('officers cannot create an Active vendor; admins can', async () => {
    const { client: officer } = await h.loginAs(app, h.ROLES.OFFICER);
    expect((await officer.post('/api/vendors', h.validVendor({ status: 'Active' }))).status).toBe(403);
    const { client: admin } = await h.loginAs(app, h.ROLES.ADMIN);
    const res = await admin.post('/api/vendors', h.validVendor({ status: 'Active' }));
    expect(res.status).toBe(201);
    expect(res.body.data.vendor.status).toBe('Active');
  });
});

describe('read, search, filter, paginate', () => {
  let client;
  beforeEach(async () => {
    ({ client } = await h.loginAs(app, h.ROLES.MANAGER));
    const owner = await h.makeUser();
    const cats = ['Furniture', 'IT Hardware', 'Logistics', 'Stationery', 'Construction'];
    const statuses = ['Active', 'Pending', 'Inactive', 'Blocked'];
    for (let i = 0; i < 25; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await h.makeVendor(owner, {
        vendorName: `Vendor ${String(i).padStart(2, '0')} ${i === 7 ? 'Office Depot' : 'Trading'}`,
        category: cats[i % 5], status: statuses[i % 4], gstNumber: '', email: `v${i}@x.example`,
        contactPerson: i === 3 ? 'Zelda Quill' : 'Sam Smith',
      });
    }
  });

  test('paginates on the server', async () => {
    const p1 = await client.get('/api/vendors?page=1&limit=10');
    expect(p1.body.data.items).toHaveLength(10);
    expect(p1.body.data.pagination).toMatchObject({ page: 1, limit: 10, total: 25, pages: 3 });
    const p3 = await client.get('/api/vendors?page=3&limit=10');
    expect(p3.body.data.items).toHaveLength(5);
    const ids = new Set([...p1.body.data.items, ...p3.body.data.items].map((v) => v.id));
    expect(ids.size).toBe(15);
  });

  test('search hits the database (name, contact person)', async () => {
    const byName = await client.get('/api/vendors?search=office depot');
    expect(byName.body.data.items.map((v) => v.vendorName)).toEqual(['Vendor 07 Office Depot']);
    const byContact = await client.get('/api/vendors?search=zelda');
    expect(byContact.body.data.pagination.total).toBe(1);
  });

  test('search treats regex characters literally', async () => {
    const res = await client.get('/api/vendors?search=.*');
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(0);
  });

  test('category and status filters combine; counts reflect the filters', async () => {
    const res = await client.get('/api/vendors?category=Furniture&status=Active&limit=50');
    expect(res.body.data.items.every((v) => v.category === 'Furniture' && v.status === 'Active')).toBe(true);
    const all = await client.get('/api/vendors?category=Furniture&status=Active');
    expect(all.body.data.counts.All).toBe(5);
    expect(all.body.data.counts.Active + all.body.data.counts.Pending + all.body.data.counts.Inactive + all.body.data.counts.Blocked).toBe(5);
  });

  test('rejects invalid query parameters', async () => {
    expect((await client.get('/api/vendors?limit=1000')).status).toBe(400);
    expect((await client.get('/api/vendors?status=Hacked')).status).toBe(400);
    expect((await client.get('/api/vendors?page=0')).status).toBe(400);
  });

  test('invalid ids give 400, unknown ids give 404', async () => {
    expect((await client.get('/api/vendors/not-an-id')).status).toBe(400);
    expect((await client.get(`/api/vendors/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
  });
});

describe('update and archive', () => {
  test('officer updates a vendor; changes persist', async () => {
    const { client, user } = await h.loginAs(app, h.ROLES.OFFICER);
    const v = await h.makeVendor(user);
    const res = await client.put(`/api/vendors/${v._id}`, h.validVendor({ vendorName: 'Acme Renamed', category: 'Services', gstNumber: '' }));
    expect(res.status).toBe(200);
    const stored = await Vendor.findById(v._id);
    expect(stored.vendorName).toBe('Acme Renamed');
    expect(stored.gstNumber).toBeUndefined();
    expect(String(stored.updatedBy)).toBe(String(user._id));
  });

  test('update validates input and handles invalid / missing ids', async () => {
    const { client, user } = await h.loginAs(app, h.ROLES.OFFICER);
    const v = await h.makeVendor(user);
    expect((await client.put(`/api/vendors/${v._id}`, { vendorName: '' })).status).toBe(400);
    expect((await client.put('/api/vendors/xyz', h.validVendor())).status).toBe(400);
    expect((await client.put(`/api/vendors/${new mongoose.Types.ObjectId()}`, h.validVendor())).status).toBe(404);
  });

  test('status approval is limited to Manager/Approver and Admin', async () => {
    const { client: officer, user } = await h.loginAs(app, h.ROLES.OFFICER);
    const v = await h.makeVendor(user);
    const attempt = await officer.put(`/api/vendors/${v._id}`, h.validVendor({ status: 'Active' }));
    expect(attempt.status).toBe(403);

    const { client: manager } = await h.loginAs(app, h.ROLES.MANAGER);
    const approve = await manager.put(`/api/vendors/${v._id}`, { status: 'Active', vendorName: 'Ignored Rename' });
    expect(approve.status).toBe(200);
    const stored = await Vendor.findById(v._id);
    expect(stored.status).toBe('Active');
    expect(stored.vendorName).toBe('Acme Office Supplies'); // managers cannot edit other fields
  });

  test('managers cannot create or archive; officers can archive', async () => {
    const { client: manager } = await h.loginAs(app, h.ROLES.MANAGER);
    const owner = await h.makeUser();
    const v = await h.makeVendor(owner);
    expect((await manager.post('/api/vendors', h.validVendor({ vendorName: 'M Co', gstNumber: '' }))).status).toBe(403);
    expect((await manager.delete(`/api/vendors/${v._id}`)).status).toBe(403);
    expect(await Vendor.countDocuments({ archivedAt: null })).toBe(1);
  });

  test('archiving hides the vendor, keeps the record, and frees the name', async () => {
    const { client, user } = await h.loginAs(app, h.ROLES.OFFICER);
    const v = await h.makeVendor(user);
    expect((await client.delete(`/api/vendors/${v._id}`)).status).toBe(200);
    expect((await client.get(`/api/vendors/${v._id}`)).status).toBe(404);
    expect((await client.get('/api/vendors')).body.data.pagination.total).toBe(0);
    expect(await Vendor.countDocuments({ _id: v._id })).toBe(1); // still in DB
    expect((await client.post('/api/vendors', h.validVendor())).status).toBe(201); // same name + GST reusable
    expect((await client.delete(`/api/vendors/${v._id}`)).status).toBe(404); // already archived
  });
});

describe('vendor role (record-level access)', () => {
  test('sees only the vendor linked to them and cannot modify anything', async () => {
    const officer = await h.makeUser();
    const { client, user } = await h.loginAs(app, h.ROLES.VENDOR);
    const mine = await h.makeVendor(officer, { vendorName: 'Mine Ltd', gstNumber: '' });
    await Vendor.updateOne({ _id: mine._id }, { linkedUser: user._id });
    const other = await h.makeVendor(officer, { vendorName: 'Theirs Ltd', gstNumber: '' });

    const list = await client.get('/api/vendors');
    expect(list.body.data.items.map((v) => v.vendorName)).toEqual(['Mine Ltd']);
    expect(list.body.data.items[0].createdBy).toBeUndefined();
    expect((await client.get(`/api/vendors/${mine._id}`)).status).toBe(200);
    expect((await client.get(`/api/vendors/${other._id}`)).status).toBe(404);
    expect((await client.post('/api/vendors', h.validVendor())).status).toBe(403);
    expect((await client.put(`/api/vendors/${mine._id}`, h.validVendor())).status).toBe(403);
    expect((await client.delete(`/api/vendors/${mine._id}`)).status).toBe(403);
  });

  test('staff can link a vendor record to a Vendor-role portal user by email', async () => {
    const { client } = await h.loginAs(app, h.ROLES.OFFICER);
    const portal = await h.makeUser({ role: h.ROLES.VENDOR });
    const ok = await client.post('/api/vendors', h.validVendor({ portalUserEmail: portal.email }));
    expect(ok.status).toBe(201);
    const bad = await client.post('/api/vendors', h.validVendor({ vendorName: 'Other', gstNumber: '', portalUserEmail: 'nobody@example.com' }));
    expect(bad.status).toBe(400);
  });
});

test('data and sessions persist across an application restart', async () => {
  const { client } = await h.loginAs(app, h.ROLES.OFFICER);
  expect((await client.post('/api/vendors', h.validVendor())).status).toBe(201);
  const cookie = client.cookie;
  expect(cookie).toMatch(/vb\.sid=/);

  // Simulate a server restart: drop the DB connection and build a brand-new app.
  const { host, port, name } = mongoose.connection;
  await disconnectDB();
  await connectDB(`mongodb://${host}:${port}/${name}`);
  app = h.createApp();

  // The vendor is still there, and the old browser session is still valid.
  const res = await h.request(app).get('/api/vendors').set('Cookie', cookie);
  expect(res.status).toBe(200);
  expect(res.body.data.items.map((v) => v.vendorName)).toContain('Acme Office Supplies');
});
