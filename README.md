# Freddo Cafe Platform

MERN monorepo (MongoDB, Express, React, Node). Sprint 1: MongoDB wired with
Mongoose, first bilingual `MenuItem` model, public menu API, and a Tailwind +
shadcn frontend that renders the menu in Arabic (RTL) and English.

## Layout

- `server/` - Express API (Node, ES modules)
- `client/` - React frontend (Vite, Tailwind CSS, shadcn-style components)
- `docs/` - walkthroughs and decisions (Arabic: `docs/WALKTHROUGH.md`,
  `docs/WALKTHROUGH-SPRINT1.md`)

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

Errors always return `{ error: { code, message: { ar, en } } }`.

## Test

```bash
npm test             # server tests (in-memory MongoDB) + client tests
```
