const h = require('./helpers');
const { ActivityLog } = require('../src/models');

let app;
beforeAll(async () => { await h.startDb(); app = h.createApp(); });
afterAll(h.stopDb);
beforeEach(h.clearDb);

describe('dashboard summary', () => {
  test('requires authentication', async () => {
    const c = await h.newClient(app);
    expect((await c.get('/api/dashboard/summary')).status).toBe(401);
  });

  test('shows honest empty states when there is no data', async () => {
    const { client } = await h.loginAs(app, h.ROLES.MANAGER);
    const { data } = (await client.get('/api/dashboard/summary')).body;
    expect(data.cards.activeVendors.value).toBe(0);
    expect(data.cards.pendingApprovals.value).toBe(0);
    expect(data.cards.procurementSpend).toMatchObject({ value: 0, available: false });
    expect(data.cards.purchaseOrders).toMatchObject({ value: 0, available: false });
    expect(data.recentActivity).toEqual([]);
  });

  test('metrics are calculated from real records and exclude archived vendors', async () => {
    const { client, user } = await h.loginAs(app, h.ROLES.ADMIN);
    const mk = (n, status, extra = {}) => h.makeVendor(user, { vendorName: `V ${n}`, gstNumber: '', status, ...extra });
    await mk(1, 'Active'); await mk(2, 'Active'); await mk(3, 'Pending'); await mk(4, 'Blocked');
    const gone = await mk(5, 'Active');
    await client.delete(`/api/vendors/${gone._id}`);
    const { data } = (await client.get('/api/dashboard/summary')).body;
    expect(data.cards.activeVendors.value).toBe(2);
    expect(data.cards.pendingApprovals.value).toBe(1);
    expect(data.vendorsByStatus).toMatchObject({ Active: 2, Pending: 1, Blocked: 1, Inactive: 0 });
    expect(data.recentActivity.length).toBeGreaterThan(0);
  });

  test('vendor-role users only get their own profile, no company metrics or activity', async () => {
    const officer = await h.makeUser();
    const { client, user } = await h.loginAs(app, h.ROLES.VENDOR);
    await h.makeVendor(officer, { vendorName: 'Other Co', gstNumber: '' });
    const { data } = (await client.get('/api/dashboard/summary')).body;
    expect(data.scope).toBe('own');
    expect(data.ownVendor).toBeNull();
    expect(data.cards).toBeUndefined();
    expect(data.recentActivity).toBeUndefined();
    expect(user.role).toBe(h.ROLES.VENDOR);
  });
});

test('activity log entries are immutable', async () => {
  await ActivityLog.create({ action: 'x', entityType: 'T', message: 'hello' });
  const entry = await ActivityLog.findOne();
  entry.message = 'tampered';
  await expect(entry.save()).rejects.toThrow(/immutable/);
  await expect(ActivityLog.updateOne({ _id: entry._id }, { message: 'x' })).rejects.toThrow(/immutable/);
  await expect(ActivityLog.deleteOne({ _id: entry._id })).rejects.toThrow(/immutable/);
});
