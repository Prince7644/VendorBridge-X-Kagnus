# VendorBridge - Procurement & Vendor Management ERP

**Week 1: Foundation & Vendor Management.** A full-stack web app with authentication, role-based
access control, a procurement dashboard and complete vendor management, backed by MongoDB.

> Later modules (RFQs, Quotations, Approvals, Purchase Orders, Invoices, Reports, full Activity log)
> appear in the sidebar exactly as in the design but are clearly labelled **Soon** and open an
> "upcoming feature" page. Nothing in them is pretended to work.

## Features implemented

**Authentication & security**
- Register (client + server validation, duplicate-email rejection), log in, log out
- Server-side sessions stored in MongoDB (they survive server restarts); logout destroys the session on the server
- Forgot / reset password: 256-bit random token, only its SHA-256 hash is stored, 30-minute expiry, single use, all existing sessions revoked after a reset
- bcrypt password hashing (cost 12); passwords never returned or logged
- Generic "Invalid email or password" for unknown email *and* wrong password (constant-time compare against a dummy hash)
- Cookies: `HttpOnly`, `Secure` in production, `SameSite=Lax`; CSRF synchroniser token on every write request; Helmet security headers; CORS limited to `CLIENT_URL`; rate limiting on auth endpoints
- Session id regenerated on login (prevents fixation); role/status changes and disabled accounts take effect on the very next request

**Roles (enforced on the backend by one central policy: `server/src/config/permissions.js`)**
Procurement Officer, Vendor, Manager/Approver, Admin. Public registration can only create **Vendor** or
**Procurement Officer**; Admin / Manager are rejected by the server. Officer sign-ups are *pending* until an
Admin approves them. Admins grant roles from the **Users** page (or `npm run create-admin` for the first admin).

**Dashboard** - welcome message, four summary cards, recent activity, vendors-by-status chart, quick actions.
All figures come from the database. Procurement spend and purchase orders show "-" (no such data exists yet) instead of invented numbers.

**Vendors** - create, view, edit, archive; server-side search (name, contact, email, phone, GST, category), category and status filters with live status counts, pagination, status badges (icon + text), loading / empty / error (with Retry) states. GST validation depends on country (India = GSTIN format; elsewhere any reasonable tax ID; always optional). Unique vendor name and tax ID.

**Responsive & accessible** - collapsible mobile sidebar, scrollable tables, labelled inputs, keyboard-operable dialogs with focus trap, visible focus, status never conveyed by colour alone.

## Tech stack
React 18 + Vite, React Router, Axios, Bootstrap 5 + custom CSS, Lucide icons - Node.js, Express 4, Mongoose 8, zod, bcryptjs, express-session + connect-mongo, helmet, express-rate-limit, nodemailer - MongoDB.

## Project structure
```
client/src/  components/ pages/ routes/ context/ services/ hooks/ utils/ config/
server/src/  config/ models/ middleware/ validators/ controllers/ routes/ services/ utils/
server/tests/   server/scripts/ (seed, create-admin)   docs/ (e2e.py, screenshots/)
```

## Prerequisites
Node.js 18+ and a MongoDB database (local `mongod` or a free MongoDB Atlas cluster).

## Setup
```bash
npm run install:all                 # root + server + client dependencies
cp .env.example .env                # then edit .env (see below)
npm run seed                        # OPTIONAL: demo users + demo vendors (dev only)
npm run dev                         # API on :5000, web app on :5173
```
Open http://localhost:5173.

### Environment variables (`.env` in the project root; never commit it)
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (required in production) |
| `SESSION_SECRET` | Long random string, 32+ chars (required in production; generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `CLIENT_URL` | Browser origin of the app (CORS + reset-link base), default `http://localhost:5173` |
| `PORT`, `NODE_ENV`, `SESSION_TTL_HOURS` | Server settings |
| `SESSION_AUTO_REMOVE` | `native` (default, MongoDB TTL index) or `interval` for MongoDB-compatible servers lacking TTL indexes |
| `AUTH_RATE_LIMIT_MAX`, `RESET_TOKEN_TTL_MINUTES` | Optional tuning |
| `EMAIL_HOST/PORT/USER/PASSWORD/FROM` | SMTP for password-reset emails |
| `SEED_PASSWORD` | Password for demo users created by `npm run seed` |

### MongoDB
- **Local:** install MongoDB Community, then `MONGODB_URI=mongodb://127.0.0.1:27017/vendorbridge`.
- **Atlas:** create a free cluster, add a database user, allow your IP under *Network Access*, copy the `mongodb+srv://...` string into `MONGODB_URI`.
Collections and indexes (unique email, unique vendor name / tax ID, status/category/date indexes) are created automatically on startup. Startup never deletes data.

### Password-reset email
With `EMAIL_HOST` set, reset links are sent over SMTP. **Without it (development),** the reset link is printed in the **server console** only - it is never sent to the browser. Real SMTP delivery was **not tested** here.

### First admin / demo accounts
- Real deployments: `ADMIN_EMAIL=you@co.com ADMIN_PASSWORD='StrongPass1' npm run create-admin`
- `npm run seed` (refuses to run in production) creates records flagged as demo data (vendors show a **Demo** tag; text contains `[DEMO DATA]`). Password `Demo@12345` unless `SEED_PASSWORD` is set:
  `admin@vendorbridge.demo`, `manager@vendorbridge.demo`, `officer@vendorbridge.demo`, `vendor@vendorbridge.demo`.

### Production
`npm run build`, then `NODE_ENV=production npm start` - Express serves the built React app and the API from one origin. **Serve over HTTPS** (the session cookie is `Secure`); behind a proxy, forward `X-Forwarded-Proto`.

## Role-permission matrix
| Capability | Admin | Manager/Approver | Procurement Officer | Vendor |
|---|:-:|:-:|:-:|:-:|
| View dashboard | yes | yes | yes | own profile only |
| Recent activity feed | yes | yes | yes | no |
| View vendors | all | all | all | **only the record linked to them** |
| Create vendor | yes | no | yes (starts *Pending*) | no |
| Edit vendor details | yes | no | yes | no |
| Set status *Active* / *Blocked* (approve) | yes | **yes** | no | no |
| Set status *Pending* / *Inactive* | yes | yes | yes | no |
| Archive ("delete") vendor | yes | no | yes | no |
| Manage users (approve sign-ups, assign roles) | yes | no | no | no |

Manager/Approver deliberately does **not** inherit Admin rights: they can only change vendor status. Nobody can change their own role.
Vendor records are linked to a Vendor-role user via "Vendor portal user email" in the vendor form.

## API
All responses: `{ "success": true, "data": ..., "message"?: ... }` or `{ "success": false, "error": { "code", "message", "details"? } }`.
Write requests need the `X-CSRF-Token` header (value from `GET /api/auth/csrf`, refreshed by `POST /api/auth/login`).

| Method & path | Access | Notes |
|---|---|---|
| `GET /api/health` | public | DB status |
| `GET /api/auth/csrf` | public | CSRF token |
| `POST /api/auth/register` | public | roles Vendor / Procurement Officer only |
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | public / any / authenticated | |
| `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` | public | generic responses, rate limited |
| `GET /api/dashboard/summary` | authenticated | scope-limited by role |
| `GET /api/vendors?search=&category=&status=&page=&limit=&sort=` | `vendor:read` | server-side filtering; returns `items`, `pagination`, `counts` |
| `GET /api/vendors/:id` | `vendor:read` | Vendor role: own record, else 404 |
| `POST /api/vendors` | `vendor:create` | |
| `PUT /api/vendors/:id` | `vendor:update` or `vendor:approve` | approvers: `{status}` only |
| `DELETE /api/vendors/:id` | `vendor:archive` | soft delete (archive); blocked if other records reference the vendor (hook in `services/vendorReferences.js`) |
| `GET /api/users` · `PATCH /api/users/:id` | `users:manage` | role / status changes, audited |

Errors: 400 validation / invalid id, 401 unauthenticated or expired, 403 forbidden or CSRF, 404 missing, 409 duplicate, 429 rate limited, 503 database unavailable. Stack traces are never returned.

## Testing - what was actually run
Run in the build environment against **FerretDB 1.24 (SQLite)**, a MongoDB-compatible server, because a real `mongod` could not be downloaded there:

| Check | Result |
|---|---|
| Backend API tests (Jest + Supertest, `server/tests`) | **43 / 43 passed** |
| Browser end-to-end journeys (Playwright, `docs/e2e.py`) | **44 / 44 passed** |
| ESLint (client) | clean |
| Production build (`npm run build`) | succeeds |
| HTTP smoke test of the real server + seeded DB; production cookie flags (`HttpOnly; Secure; SameSite=Lax`) | verified |

Backend tests cover: registration, duplicate email, bcrypt hashing, privileged-role rejection, pending officers, generic login errors, session cookie flags, logout invalidating the server session (including replaying the old cookie), CSRF, disabled accounts, reset-token hashing / expiry / single use / session revocation, admin-only endpoints, vendor CRUD, validation, jurisdiction-aware GST, duplicate name/GST, search (regex-safe), filters, pagination, invalid/missing ids, approver-only statuses, archive + name reuse, Vendor-role record-level access, dashboard metrics and empty states, immutable activity log, **and persistence of data and sessions across an app restart**.
Browser tests cover registration -> login, protected routes, each role's UI restrictions, vendor create / validate / search / filter / edit / refresh-persistence / archive, manager approval, admin Users page, forgot-password, and mobile layout.

```bash
npm test                                    # uses an in-memory MongoDB (downloads a binary on first run)
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/vendorbridge_test npm test   # or point at any database whose name contains "test"
# browser e2e: start API + `npm run dev:client`, seed, then:  pip install playwright && playwright install chromium && python3 docs/e2e.py
```
Bugs found by these tests and fixed during the build: filter changes being lost when made right after typing in search; a delayed post-login redirect that could override the user's navigation; reset-password failing on servers without `findAndModify` projection support.

## Demonstration evidence
`docs/screenshots/` contains images captured from the running app: login, registration (validation + filled), vendor-role dashboard, officer dashboard, upcoming-module page, vendor form validation, vendors list, search, empty filter state, vendor details, archive confirmation, manager view, admin Users page, forgot-password, and three mobile views. Vendor rows named "E2E Supplies ..." are records created by the automated test run. For a video, record the flow: register -> login -> add / edit / search / archive a vendor -> log in as each demo role -> logout.

## Design notes and deviations from the wireframe
- Login field is labelled **Email address** (the brief requires email login; the wireframe says "Username").
- Registration "Role" dropdown only offers non-privileged roles (security requirement).
- Vendor statuses: Pending, Active, Inactive, Blocked (wireframe shows All / Active / Pending / Blocked).
- Dashboard cards are vendor-based (Active vendors, Pending approvals, Procurement spend, Purchase orders) because RFQs / invoices do not exist yet.
- Added a small **Users** admin page (needed to approve officers and assign Manager/Admin roles); it appears only for Admins.

## Known limitations
- **Not tested against a real `mongod` / MongoDB Atlas** (FerretDB used instead). The default `npm test` path (in-memory MongoDB) was not run in the build environment.
- SMTP email delivery not tested; dev mode prints links to the server console.
- Not deployed; not pushed to GitHub (no repository access in the build environment) - commit and push from your machine.
- No formal accessibility audit (e.g. axe) was run; semantics, labels, focus handling were built in and spot-checked.
- Rate limiting is in-memory per process (use a shared store if you run several instances).
- GST is format-validated only (no checksum or government registry lookup).
- Profile photo is stored as a small (128 px) data URL on the user record; no file uploads yet.
- Vendor self-registrations are not auto-linked to a company record; staff link them by email.
- No automated frontend unit tests (UI is covered by the Playwright journey).

## Suggested next steps
Run `npm test` on your machine against a real MongoDB, configure SMTP, deploy behind HTTPS, then build RFQs and Quotations on the existing vendor model (`vendorReferences` is where archive-protection will plug in) and extend `permissions.js` for new modules.
