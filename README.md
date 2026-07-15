# Incedo Client Prep

A tracker for client demos & pilots — Azure DevOps-style UI.

- **Frontend:** React SPA (Vite) — served as static files.
- **Backend:** Express running as a **Vercel serverless function** under `/api`.
- **Database:** **Turso** (libSQL) — SQLite-compatible, works as a local file in dev and over HTTP in production.
- **Auth:** bcrypt-hashed passwords + a stateless **JWT stored in an httpOnly cookie** (works on serverless — no session store needed).

## Repo layout

```
client_Demos/
├── api/                 Serverless Express app (Vercel functions)
│   ├── index.js         routes: auth + entries CRUD (exported Express app)
│   └── db.js            libSQL client, schema, seeding
├── client/              React SPA (Vite)  ->  builds to client/dist
├── dev-server.js        local runner (hosts api/ on :3001, serves client/dist)
├── vercel.json          build command, output dir, /api rewrite
└── package.json         API dependencies + scripts
```

## Local development

```bash
npm run install:all         # root (API) deps + client deps

# Option A — one server, prebuilt UI:
npm run build               # build the client
npm start                   # http://localhost:3001  (API + UI, file DB dev.db)

# Option B — hot reload (two terminals):
npm run dev:server          # API on :3001
npm run dev:client          # Vite on :5173 (proxies /api -> :3001)
```

In dev the database is a local file (`dev.db`) created automatically — no cloud account needed.

### Demo credentials

| Username | Password    |
|----------|-------------|
| `admin`  | `demo1234`  |
| `ujjwal` | `pilot2026` |

Seeded on first run (passwords hashed). Change/add users in the seed block of [api/db.js](api/db.js).

---

## Deploying to Vercel

Vercel is serverless, so the app uses Turso (hosted libSQL) instead of a local SQLite file.

### 1. Create a Turso database (free)

Easiest is the Vercel Marketplace integration, or the Turso CLI:

```bash
# install CLI + sign up
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup

# create a db and get its credentials
turso db create incedo-client-prep
turso db show incedo-client-prep --url          # -> libsql://...  (TURSO_DATABASE_URL)
turso db tokens create incedo-client-prep       # -> a token       (TURSO_AUTH_TOKEN)
```

### 2. Set environment variables in Vercel

Project → **Settings → Environment Variables**:

| Name                  | Value                                   |
|-----------------------|-----------------------------------------|
| `TURSO_DATABASE_URL`  | `libsql://…` from step 1                 |
| `TURSO_AUTH_TOKEN`    | the token from step 1                    |
| `JWT_SECRET`          | any long random string                  |

### 3. Deploy

Import the repo in Vercel and deploy (or `vercel --prod`). `vercel.json` already sets:

- **Build command:** `npm --prefix client install && npm --prefix client run build`
  (this fixes the original `vite: command not found` error — the client's deps are now installed during the build)
- **Output directory:** `client/dist`
- **Rewrite:** `/api/(.*) → /api` so all API calls hit the Express function

The schema and demo users/entries are created automatically on the first request.

> **Note:** rotate the demo passwords and set a strong `JWT_SECRET` before sharing the deployment. Cookies are `Secure` + `httpOnly` in production.
