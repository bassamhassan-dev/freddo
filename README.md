# Freddo Cafe Platform

MERN monorepo (MongoDB, Express, React, Node). Sprint 1.5: feature-based
layering (routes - controllers - services - models), unified API response
shape, AppError + catchAsync + global error handler. Sprint 1: MongoDB wired with
Mongoose, first bilingual `MenuItem` model, public menu API, and a Tailwind +
shadcn frontend that renders the menu in Arabic (RTL) and English.

## Layout

- `server/` - Express API (Node, ES modules)
- `client/` - React frontend (Vite, Tailwind CSS, shadcn-style components)
- `docs/` - walkthroughs and decisions (Arabic: `docs/WALKTHROUGH.md`,
  `docs/WALKTHROUGH-SPRINT1.md`). `docs/CONVENTIONS.md` is the standing
  blueprint every sprint follows (layering, error handling, response
  shape, naming, and the reasoning behind each).

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

`server/.env` holds your secrets (the MongoDB connection string). It is
gitignored and must never be committed or shared.

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

Every response follows one shape (see `docs/CONVENTIONS.md`): success is
`{ success: true, data: ... }`, error is
`{ success: false, error: { code, message: { ar, en } } }`.

## Test

```bash
npm test             # server tests (in-memory MongoDB) + client tests
```
