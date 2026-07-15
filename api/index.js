import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';
import { getEntries, saveEntries } from './store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PROD = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const COOKIE = 'token';
const MAX_AGE = 60 * 60 * 8; // 8 hours

// Demo users are baked in (no database needed for auth). Passwords are hashed
// at startup; override defaults with env vars before sharing a deployment.
const USERS = [
  ['admin', process.env.ADMIN_PASSWORD || 'demo1234'],
  ['ujjwal', process.env.UJJWAL_PASSWORD || 'pilot2026'],
].map(([username, pw]) => ({ username, hash: bcrypt.hashSync(pw, 10) }));

const app = express();
app.use(express.json());

// --- auth helpers (stateless JWT in an httpOnly cookie) ---
function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: MAX_AGE });
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: PROD, path: '/', maxAge: MAX_AGE })
  );
}

function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: PROD, path: '/', maxAge: 0 })
  );
}

function currentUser(req) {
  const token = parse(req.headers.cookie || '')[COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  req.user = user;
  next();
}

// --- auth routes ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = USERS.find((u) => u.username === String(username).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  setAuthCookie(res, { username: user.username });
  res.json({ user: user.username });
});

app.post('/api/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: user.username });
});

// --- entries CRUD (read-modify-write of the light JSON store) ---
app.get('/api/entries', requireAuth, async (req, res) => {
  res.json(await getEntries());
});

app.post('/api/entries', requireAuth, async (req, res) => {
  const e = sanitizeEntry(req.body);
  if (!e.client) return res.status(400).json({ error: 'Client name is required' });
  const entries = await getEntries();
  const id = entries.reduce((max, x) => Math.max(max, Number(x.id) || 0), 0) + 1;
  const entry = { id, ...e };
  entries.push(entry);
  await saveEntries(entries);
  res.status(201).json(entry);
});

app.put('/api/entries/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const e = sanitizeEntry(req.body);
  if (!e.client) return res.status(400).json({ error: 'Client name is required' });
  const entries = await getEntries();
  const idx = entries.findIndex((x) => Number(x.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  entries[idx] = { ...entries[idx], ...e };
  await saveEntries(entries);
  res.json(entries[idx]);
});

app.delete('/api/entries/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const entries = await getEntries();
  await saveEntries(entries.filter((x) => Number(x.id) !== id));
  res.json({ ok: true });
});

function sanitizeEntry(body = {}) {
  return {
    client: String(body.client || '').trim(),
    type: String(body.type || 'Demo').trim(),
    date: String(body.date || '').trim(),
    status: String(body.status || 'Scheduled').trim(),
    owner: String(body.owner || '').trim(),
    notes: String(body.notes || '').trim(),
  };
}

// --- error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

export default app;
