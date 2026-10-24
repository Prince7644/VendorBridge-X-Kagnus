process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const request = require('supertest');
const { connectDB, disconnectDB } = require('../src/config/db');
const { createApp } = require('../src/app');
const { User, Vendor } = require('../src/models');
const { ROLES } = require('../src/config/constants');

const PASSWORD = 'Passw0rd!x';
let memoryServer;

async function startDb() {
  const uri = process.env.TEST_MONGODB_URI;
  if (uri) {
    // Safety: never wipe a database that is not clearly a test database.
    if (!/test/i.test(uri.split('/').pop())) throw new Error('TEST_MONGODB_URI database name must contain "test".');
    await connectDB(uri);
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    await connectDB(memoryServer.getUri('vendorbridge_test'));
  }
}

async function stopDb() {
  await disconnectDB();
  if (memoryServer) await memoryServer.stop();
}

// Raw collection access so the immutable ActivityLog model hooks are bypassed.
async function clearDb() {
  await Promise.all(['users', 'vendors', 'activitylogs', 'sessions'].map((c) => mongoose.connection.collection(c).deleteMany({})));
}

async function makeUser(overrides = {}) {
  const n = Math.random().toString(36).slice(2, 8);
  return User.create({
    firstName: 'Test',
    lastName: 'User',
    email: `user-${n}@example.com`,
    phone: '+91 90000 00000',
    country: 'India',
    passwordHash: await User.hashPassword(PASSWORD),
    role: ROLES.OFFICER,
    status: 'active',
    ...overrides,
  });
}

// supertest agent that keeps the session cookie and the CSRF token together.
async function newClient(app) {
  const agent = request.agent(app);
  const c = { agent, token: null };
  const refresh = async () => { c.token = (await agent.get('/api/auth/csrf')).body.data.csrfToken; };
  await refresh();
  c.get = (url) => agent.get(url);
  ['post', 'put', 'patch', 'delete'].forEach((m) => {
    c[m] = (url, body) => agent[m](url).set('X-CSRF-Token', c.token).send(body);
  });
  c.login = async (email, password = PASSWORD) => {
    const res = await c.post('/api/auth/login', { email, password });
    if (res.status === 200) {
      c.token = res.body.data.csrfToken;
      c.cookie = res.headers['set-cookie'].map((x) => x.split(';')[0]).join('; '); // raw session cookie
    }
    return res;
  };
  c.logout = async () => { const res = await c.post('/api/auth/logout', {}); await refresh(); return res; };
  return c;
}

async function loginAs(app, role, extra = {}) {
  const user = await makeUser({ role, ...extra });
  const client = await newClient(app);
  const res = await client.login(user.email);
  if (res.status !== 200) throw new Error(`login failed in test helper: ${res.status} ${JSON.stringify(res.body)}`);
  return { client, user };
}

const validVendor = (over = {}) => ({
  vendorName: 'Acme Office Supplies',
  category: 'Furniture',
  gstNumber: '24AAACA1234A1Z5',
  contactPerson: 'Jane Doe',
  email: 'jane@acme.example',
  phone: '+91 98250 12345',
  address: '12 Market Road, Ahmedabad',
  country: 'India',
  additionalInformation: 'Preferred supplier',
  ...over,
});

const makeVendor = (createdBy, over = {}) => {
  const base = validVendor(over);
  return Vendor.create({ ...base, status: base.status || 'Pending', createdBy: createdBy._id });
};

module.exports = { PASSWORD, startDb, stopDb, clearDb, makeUser, newClient, loginAs, validVendor, makeVendor, createApp, ROLES, request };
