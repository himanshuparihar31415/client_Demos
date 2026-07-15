# Departures — Demos & Pilots Tracker

A small full-stack web app for tracking client demos and pilots.

- **Backend:** Node + Express REST API, SQLite (built-in `node:sqlite`), real password hashing (bcrypt), server-side sessions.
- **Frontend:** React single-page app (Vite), talking to the API.
- **Data:** stored on the server in SQLite, so it's shared across browsers and devices (not per-browser like the old standalone HTML version).

## Prerequisites

- Node.js 22.5+ (uses the built-in `node:sqlite`; developed on Node 24)

## Setup

```bash
# from the repo root
npm run install:all      # installs server + client dependencies
npm run build            # builds the React client into client/dist
npm start                # starts the server + serves the app at http://localhost:3001
```

Then open **http://localhost:3001**.

### Demo credentials

| Username | Password    |
|----------|-------------|
| `admin`  | `demo1234`  |
| `ujjwal` | `pilot2026` |

These users are seeded automatically the first time the server runs (passwords are hashed
in the database). Change or add users by editing the seed block in [server/db.js](server/db.js).

## Development (hot reload)

Run the API and the Vite dev server in two terminals:

```bash
npm run dev:server       # Express on :3001 (auto-restarts on change)
npm run dev:client       # Vite on :5173, proxies /api to :3001
```

Open **http://localhost:5173** for the hot-reloading dev experience.

## Project layout

```
client_Demos/
├── server/              Express API + SQLite
│   ├── index.js         routes: auth + entries CRUD, serves built client
│   ├── db.js            schema, seeding, DB connection
│   └── data/app.db      SQLite database (gitignored, created on first run)
├── client/              React SPA (Vite)
│   └── src/
│       ├── App.jsx      auth gate — shows Login or Board
│       ├── Login.jsx    sign-in form
│       ├── Board.jsx    the tracker board (list, alerts, add/edit/delete)
│       ├── api.js       fetch wrapper for the API
│       └── styles.css   white theme
└── package.json         root scripts (install:all, build, start, dev:*)
```

## API

All `/api/entries` routes require an authenticated session cookie.

| Method | Path                | Purpose                    |
|--------|---------------------|----------------------------|
| POST   | `/api/login`        | Sign in                    |
| POST   | `/api/logout`       | Sign out                   |
| GET    | `/api/me`           | Current session user       |
| GET    | `/api/entries`      | List all entries           |
| POST   | `/api/entries`      | Create an entry            |
| PUT    | `/api/entries/:id`  | Update an entry            |
| DELETE | `/api/entries/:id`  | Delete an entry            |

## Notes

- Set `SESSION_SECRET` (env var) to a strong random value in any real deployment; the
  default is a dev placeholder. Set `PORT` to change the port (default `3001`).
- The older `login.html` / `demo_pilot_tracker.html` are the original standalone
  (browser-only, `localStorage`) prototype and are kept for reference.
