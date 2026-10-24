const h = require('./helpers');
const { User } = require('../src/models');
const { outbox } = require('../src/services/mailer');
const mongoose = require('mongoose');

let app;
beforeAll(async () => { await h.startDb(); app = h.createApp(); });
afterAll(h.stopDb);
beforeEach(async () => { await h.clearDb(); outbox.length = 0; });

const regBody = (over = {}) => ({
  firstName: 'Ana', lastName: 'Lopez', email: 'ana@example.com', phone: '+91 98765 43210',
  country: 'India', password: 'Secret123', confirmPassword: 'Secret123', ...over,
});

describe('registration', () => {
  test('succeeds with valid input and stores a bcrypt hash, never the plaintext', async () => {
    const c = await h.newClient(app);
    const res = await c.post('/api/auth/register', regBody());
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toMatch(/Secret123|passwordHash/);
    const stored = await User.findOne({ email: 'ana@example.com' }).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.passwordHash).not.toContain('Secret123');
    expect(stored.role).toBe(h.ROLES.VENDOR);
    expect(stored.status).toBe('active');
  });

  test('rejects a duplicate email (case-insensitive)', async () => {
    const c = await h.newClient(app);
    await c.post('/api/auth/register', regBody());
    const res = await c.post('/api/auth/register', regBody({ email: 'ANA@example.com' }));
    expect(res.status).toBe(409);
    expect(await User.countDocuments({ email: 'ana@example.com' })).toBe(1);
  });

  test.each(['Admin', 'Manager/Approver'])('public users cannot self-assign the %s role', async (role) => {
    const c = await h.newClient(app);
    const res = await c.post('/api/auth/register', regBody({ role }));
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('role');
    expect(await User.countDocuments()).toBe(0);
  });

  test('Procurement Officer sign-ups are pending until an admin approves; extra fields are ignored', async () => {
    const c = await h.newClient(app);
    const res = await c.post('/api/auth/register', regBody({ role: 'Procurement Officer', status: 'active', tokenVersion: 99 }));
    expect(res.status).toBe(201);
    const u = await User.findOne({ email: 'ana@example.com' });
    expect(u.status).toBe('pending');
    const login = await c.login('ana@example.com', 'Secret123');
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_PENDING');
  });

  test('validates fields on the server', async () => {
    const c = await h.newClient(app);
    const res = await c.post('/api/auth/register', regBody({ email: 'nope', password: 'short', confirmPassword: 'different', phone: 'abc' }));
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password', 'phone']));
  });
});

describe('login / logout / sessions', () => {
  test('valid login returns the user, sets an HttpOnly SameSite cookie and no secrets', async () => {
    const user = await h.makeUser();
    const c = await h.newClient(app);
    const res = await c.login(user.email);
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/vb\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenVersion/);
    expect((await c.get('/api/auth/me')).body.data.user.email).toBe(user.email);
  });

  test('wrong password and unknown email produce the same generic 401', async () => {
    const user = await h.makeUser();
    const c = await h.newClient(app);
    const wrong = await c.login(user.email, 'WrongPass1');
    const unknown = await c.login('nobody@example.com', 'WrongPass1');
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
  });

  test('logout invalidates the session server-side (old cookie is dead)', async () => {
    const user = await h.makeUser();
    const c = await h.newClient(app);
    await c.login(user.email);
    const cookieBefore = c.cookie;
    expect(cookieBefore).toMatch(/vb\.sid=/); // make sure we really captured a session cookie
    expect((await h.request(app).get('/api/auth/me').set('Cookie', cookieBefore)).status).toBe(200);
    expect((await c.logout()).status).toBe(200);
    expect((await c.get('/api/auth/me')).status).toBe(401);
    // Replay the pre-logout cookie with a brand-new client: must still be rejected.
    const replay = await h.request(app).get('/api/auth/me').set('Cookie', cookieBefore);
    expect(replay.status).toBe(401);
  });

  test('protected endpoints reject unauthenticated requests', async () => {
    const c = await h.newClient(app);
    for (const url of ['/api/auth/me', '/api/dashboard/summary', '/api/vendors', '/api/users']) {
      const res = await c.get(url);
      expect(res.status).toBe(401);
    }
  });

  test('state-changing requests without a CSRF token are rejected', async () => {
    const res = await h.request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });

  test('disabled accounts lose access immediately', async () => {
    const { client, user } = await h.loginAs(app, h.ROLES.OFFICER);
    expect((await client.get('/api/vendors')).status).toBe(200);
    await User.updateOne({ _id: user._id }, { status: 'disabled' });
    expect((await client.get('/api/vendors')).status).toBe(401);
  });
});

describe('role-based authorization', () => {
  test('non-admins cannot reach admin endpoints', async () => {
    for (const role of [h.ROLES.OFFICER, h.ROLES.MANAGER, h.ROLES.VENDOR]) {
      const { client } = await h.loginAs(app, role);
      expect((await client.get('/api/users')).status).toBe(403);
    }
  });

  test('admin can promote and approve users; cannot edit themselves', async () => {
    const { client: admin, user: adminUser } = await h.loginAs(app, h.ROLES.ADMIN);
    const pending = await h.makeUser({ role: h.ROLES.OFFICER, status: 'pending' });
    const res = await admin.patch(`/api/users/${pending._id}`, { status: 'active', role: h.ROLES.MANAGER });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe(h.ROLES.MANAGER);
    expect((await admin.patch(`/api/users/${adminUser._id}`, { role: h.ROLES.VENDOR })).status).toBe(403);
    expect((await admin.patch('/api/users/not-an-id', { role: h.ROLES.VENDOR })).status).toBe(400);
  });
});

describe('password reset', () => {
  const tokenFromOutbox = () => outbox[outbox.length - 1].text.match(/token=([a-f0-9]{64})/)[1];

  test('same generic response for known and unknown emails; only known gets an email', async () => {
    const user = await h.makeUser();
    const c = await h.newClient(app);
    const known = await c.post('/api/auth/forgot-password', { email: user.email });
    const unknown = await c.post('/api/auth/forgot-password', { email: 'ghost@example.com' });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(outbox).toHaveLength(1);
    expect(JSON.stringify(known.body)).not.toMatch(/[a-f0-9]{64}/);
  });

  test('stores only a hash of the token', async () => {
    const user = await h.makeUser();
    const c = await h.newClient(app);
    await c.post('/api/auth/forgot-password', { email: user.email });
    const token = tokenFromOutbox();
    const stored = await User.findById(user._id).select('+passwordReset.tokenHash +passwordReset.expiresAt');
    expect(stored.passwordReset.tokenHash).toBeDefined();
    expect(stored.passwordReset.tokenHash).not.toBe(token);
    expect(stored.passwordReset.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('token resets the password once, then cannot be reused; old sessions die', async () => {
    const { client: old, user } = await h.loginAs(app, h.ROLES.OFFICER);
    const c = await h.newClient(app);
    await c.post('/api/auth/forgot-password', { email: user.email });
    const token = tokenFromOutbox();

    const ok = await c.post('/api/auth/reset-password', { token, password: 'Brandnew99', confirmPassword: 'Brandnew99' });
    expect(ok.status).toBe(200);
    expect((await c.login(user.email, 'Brandnew99')).status).toBe(200);
    expect((await c.login(user.email, h.PASSWORD)).status).toBe(401);
    expect((await old.get('/api/auth/me')).status).toBe(401);

    const reuse = await c.post('/api/auth/reset-password', { token, password: 'Another123', confirmPassword: 'Another123' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  test('expired tokens are rejected', async () => {
    const user = await h.makeUser();
    const c = await h.newClient(app);
    await c.post('/api/auth/forgot-password', { email: user.email });
    const token = tokenFromOutbox();
    await mongoose.connection.collection('users').updateOne({ _id: user._id }, { $set: { 'passwordReset.expiresAt': new Date(Date.now() - 1000) } });
    const res = await c.post('/api/auth/reset-password', { token, password: 'Brandnew99', confirmPassword: 'Brandnew99' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  test('malformed tokens fail validation', async () => {
    const c = await h.newClient(app);
    const res = await c.post('/api/auth/reset-password', { token: 'abc', password: 'Brandnew99', confirmPassword: 'Brandnew99' });
    expect(res.status).toBe(400);
  });
});
