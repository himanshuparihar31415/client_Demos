import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';
import { db, initDb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PROD = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const COOKIE = 'token';
const MAX_AGE = 60 * 60 * 8; // 8 hours

const app = express();
app.use(express.json());

// Ensure schema/seed exist (idempotent; runs once per cold start).
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (e) {
    next(e);
  }
});

// --- auth helpers (stateless JWT in an httpOnly cookie) ---
function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: MAX_AGE });
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: PROD,
      path: '/',
      maxAge: MAX_AGE,
    })
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
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [String(username).trim().toLowerCase()],
  });
  const user = result.rows[0];
  if (!user || !bcrypt.compareSync(password, user.pw_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  setAuthCookie(res, { userId: Number(user.id), username: user.username });
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

// --- entries CRUD ---
app.get('/api/entries', requireAuth, async (req, res) => {
  const result = await db.execute('SELECT * FROM entries');
  res.json(result.rows);
});

app.post('/api/entries', requireAuth, async (req, res) => {
  const e = sanitizeEntry(req.body);
  if (!e.client) return res.status(400).json({ error: 'Client name is required' });
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: `INSERT INTO entries (client, type, date, status, owner, notes, created, updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [e.client, e.type, e.date, e.status, e.owner, e.notes, now, now],
  });
  res.status(201).json(result.rows[0]);
});

app.put('/api/entries/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const e = sanitizeEntry(req.body);
  if (!e.client) return res.status(400).json({ error: 'Client name is required' });
  const result = await db.execute({
    sql: `UPDATE entries SET client=?, type=?, date=?, status=?, owner=?, notes=?, updated=?
          WHERE id=? RETURNING *`,
    args: [e.client, e.type, e.date, e.status, e.owner, e.notes, new Date().toISOString(), id],
  });
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

app.delete('/api/entries/:id', requireAuth, async (req, res) => {
  await db.execute({ sql: 'DELETE FROM entries WHERE id = ?', args: [Number(req.params.id)] });
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
