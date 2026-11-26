# Freddo Cafe Platform

MERN monorepo (MongoDB, Express, React, Node). Sprint 13: homepage
banners - three admin-managed placements (main slider + two secondary),
campaign windows, CTA validation. Sprint 12: loyalty points -
earn on completed orders only, append-only ledger with per-order
idempotency, admin adjustments, balance on the account page. Sprint 11:
contact messages - public rate-limited form, admin inbox tab. Sprint 10:
reservations - table assignment, seatings, lead time, customer cancel.
Sprint 9: coupons - percent/fixed with expiry and usage caps, checkout field.
Sprint 8: reviews - verified-purchase badge, admin moderation. Sprint 7:
account management. Sprint 6: barista workspace + recipes. Sprint 5:
minimal admin. Sprint 4: orders -
server-authoritative COD orders with snapshots, idempotency, cancellation,
checkout + order history UI. Sprint 3: guest cart. Sprint 2: auth (JWT
access+refresh rotation, unified login). Sprint 1.5: feature-based layering
and the unified API response shape. Sprint 1: MongoDB + first bilingual
menu API + the Tailwind/shadcn frontend in Arabic (RTL) and English.

## Layout

- `server/` - Express API (Node, ES modules)
- `client/` - React frontend (Vite, Tailwind CSS, shadcn-style components)
- `docs/` - walkthroughs and decisions (Egyptian Arabic:
  `docs/WALKTHROUGH.md` and `docs/WALKTHROUGH-SPRINT1.md` through
  `docs/WALKTHROUGH-SPRINT13.md`, one per sprint).
  `docs/CONVENTIONS.md` is the standing blueprint every sprint follows
  (layering, error handling, response shape, naming, and the reasoning
  behind each).

## Tech stack (what and why)

**Server**
- **Node.js + Express 4** - the API runtime and framework. The industry
  default for MERN; the whole team-market knows it, and its middleware model
  is what our layered structure (CONVENTIONS.md) builds on.
- **MongoDB + Mongoose 8** - the database and its ODM. Menu data is document-
  shaped (items with embedded variants/add-ons), so a document store fits
  better than tables with joins. Mongoose adds schema validation and
  indexes in code, right next to the model.
- **dotenv** - loads `.env` in development. Twelve-factor: config comes from
  the environment, secrets never live in code.
- **cors** - lets the Vite dev server (port 5173) call the API (port 5000)
  in development. In production one origin serves both.
- **mongodb-memory-server** (dev) - a real MongoDB started in memory for
  tests. Tests hit a real database (catches real validation/query bugs)
  with zero credentials and zero setup.
- **bcryptjs** - password hashing. Pure JavaScript, so installs identically
  on every machine (no native builds), and explicitly approved by the
  requirements doc. Cost factor 12.
- **jsonwebtoken** - access/refresh JWT signing and verification.
- **cookie-parser** - reads the HttpOnly refresh cookie.
- **helmet** - the standard Express security headers, one line (doc 22).
- **express-rate-limit** - brute-force protection on login/register.

**Client**
- **React 18 + Vite** - the UI library and build tool. React is the R in
  MERN; Vite gives instant dev-server startup and fast hot reload.
- **Tailwind CSS 3** - utility-first CSS. The Freddo identity (neon amber on
  near-black) lives in `tailwind.config.js` as design tokens, so colors and
  fonts stay consistent and are never hand-typed per component.
- **shadcn-style components** (`client/src/components/ui/`) - accessible,
  unstyled-by-default primitives (Radix) that we own and style with our
  tokens, instead of a fixed-look component library.
- **Vitest + Testing Library** (dev) - client test runner and DOM testing.
  Vitest shares Vite's config (zero extra setup); Testing Library forces
  tests to behave like a user, not like the implementation.
- **react-router-dom** - client-side routing (menu, login, register,
  account, role workspaces). Added in Sprint 2 when the app grew past one
  page.
- **zustand** - client state (the auth session). ~1KB, no boilerplate, and
  the state library named by the requirements doc.

**Tooling**
- **npm workspaces** - one `npm install` for server + client, one repo.
- **node --test** - the server's built-in test runner. No extra dependency
  for something Node already does well.

## Setup

```bash
npm install
cp server/.env.example server/.env   # put your real MONGO_URI in server/.env
cp client/.env.example client/.env
```

`server/.env` holds your secrets (the MongoDB connection string, the two
JWT secrets, optional first-admin credentials `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
It is gitignored and must never be committed or shared. See
`docs/WALKTHROUGH-SPRINT2.md` for the full local auth setup.

## Run

```bash
npm run dev          # server + client together
npm run dev:server   # API only, http://localhost:5000
npm run dev:client   # frontend only, http://localhost:5173
```

## Seed the menu

```bash
npm run seed         # loads 11 sample bilingual menu items (safe to re-run)
```

## API

- `GET /api/health` - liveness check
- `GET /api/menu` - available menu items (`?category=<slug>` to filter)
- `GET /api/menu/:slug` - one available item
- `POST /api/auth/register` - customer registration (role is always `customer`)
- `POST /api/auth/login` - unified login for all roles
- `POST /api/auth/refresh` - rotate the refresh cookie, get a new access token
- `POST /api/auth/logout` - revoke the refresh session
- `GET /api/auth/me` - current user (Bearer access token)
- `POST /api/orders` - place a COD order (auth; ids+quantities only, the
  server re-prices; `Idempotency-Key` header makes retries safe)
- `GET /api/orders/mine` - the customer's orders
- `GET /api/orders/:id` - one order (owner or admin)
- `POST /api/orders/:id/cancel` - cancel while still pending
- `POST /api/reviews` / `GET /api/reviews` - write (auth) / read (public,
  visible-only) reviews
- `POST /api/coupons/validate` - check a coupon code against a cart total
- `POST /api/reservations` / `GET /api/reservations/mine` /
  `POST /api/reservations/:id/cancel` - book a table (auth)
- `POST /api/contact` - public, rate-limited contact form
- `GET /api/loyalty/mine` - the customer's points balance + recent ledger
- `GET /api/banners?placement=main|secondary_left|secondary_right` -
  active in-window banners (public); CRUD under `GET/POST /api/admin/banners`
  and `PATCH/DELETE /api/admin/banners/:id` (admin)
- `POST /api/loyalty/admin/adjust` - admin points correction (reason
  mandatory)
- `GET /api/admin/...` - staff dashboards (orders, menu, accounts, reviews,
  coupons, reservations, contact) - all admin-role only
- `GET /api/barista/...` - the barista workspace (today's queue, recipes)

Every response follows one shape (see `docs/CONVENTIONS.md`): success is
`{ success: true, data: ... }`, error is
`{ success: false, error: { code, message: { ar, en } } }`.

## Test

```bash
npm test             # server tests (in-memory MongoDB) + client tests
```
