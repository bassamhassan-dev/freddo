# Freddo Cafe Platform

MERN monorepo (MongoDB, Express, React, Node). Sprint 0 skeleton: project
structure, bilingual Arabic/English support with RTL/LTR, boot and test
commands. No business logic yet.

## Layout

- `server/` - Express API (Node, ES modules)
- `client/` - React frontend (Vite)
- `docs/` - walkthrough and decisions (Arabic: `docs/WALKTHROUGH.md`)

## Setup

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

## Run

```bash
npm run dev          # server + client together
npm run dev:server   # API only, http://localhost:5000
npm run dev:client   # frontend only, http://localhost:5173
```

## Test

```bash
npm test             # server tests + client tests
```
