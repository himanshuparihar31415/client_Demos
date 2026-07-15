# Incedo Client Prep

A tracker for client demos & pilots — Azure DevOps-style UI.

- **Frontend:** React SPA (Vite) — served as static files.
- **Backend:** Express running as a **Vercel serverless function** under `/api`.
- **Data:** a single lightweight JSON store — a plain **file** (`data/store.json`) in local dev, and Vercel's free **KV store** in production (Vercel has no writable disk).
- **Auth:** two demo users baked into the code (bcrypt-hashed) + a stateless **JWT in an httpOnly cookie**. No database needed for login.

## Repo layout

```
client_Demos/
├── api/                 Serverless Express app (Vercel functions)
│   ├── index.js         routes: auth + entries CRUD (exported Express app)
│   └── store.js         light entries store: JSON file (dev) / Vercel KV (prod)
├── client/              React SPA (Vite)  ->  builds to client/dist
├── dev-server.js        local runner (hosts api/ on :3001, serves client/dist)
├── vercel.json          build command, output dir, /api rewrite
└── package.json         API dependencies + scripts
```

## Local development

No accounts, no database — entries are stored in a local JSON file.

```bash
npm run install:all         # root (API) deps + client deps

# Option A — one server, prebuilt UI:
npm run build               # build the client
npm start                   # http://localhost:3001

# Option B — hot reload (two terminals):
npm run dev:server          # API on :3001
npm run dev:client          # Vite on :5173 (proxies /api -> :3001)
```

`data/store.json` is created automatically on first use.

### Demo credentials

| Username | Password    |
|----------|-------------|
| `admin`  | `demo1234`  |
| `ujjwal` | `pilot2026` |

Defined (hashed) in [api/index.js](api/index.js). Override the passwords with the
`ADMIN_PASSWORD` / `UJJWAL_PASSWORD` env vars before sharing a deployment.

---

## Deploying to Vercel

The original `vite: command not found` build error is fixed by [vercel.json](vercel.json),
which installs the client's deps before building. The remaining step is storage:
Vercel's filesystem is read-only, so production data lives in a free KV store.

### 1. Add a KV store (one click, no separate account)

In your Vercel project → **Storage** → create an **Upstash for Redis** (KV) store and
connect it to the project. Vercel injects the connection env vars automatically
(`KV_REST_API_URL` + `KV_REST_API_TOKEN`).

### 2. Set one more env variable

Project → **Settings → Environment Variables**:

| Name         | Value                  |
|--------------|------------------------|
| `JWT_SECRET` | any long random string |

(Optional: `ADMIN_PASSWORD`, `UJJWAL_PASSWORD` to change the demo logins.)

### 3. Deploy

Import the repo and deploy (or `vercel --prod`). `vercel.json` handles the rest:

- **Build:** `npm --prefix client install && npm --prefix client run build`
- **Output:** `client/dist`
- **Rewrite:** `/api/(.*) → /api` so API calls reach the Express function

The seed entries are written to KV on the first request.

> If no KV store is connected in production, the API will error on write (there's no
> disk to fall back to). Locally it always uses the JSON file, so `npm start` just works.
>
> **Note:** this simple store rewrites the whole entries list on each change — fine for a
> small team tracker, but not built for heavy concurrent editing.
