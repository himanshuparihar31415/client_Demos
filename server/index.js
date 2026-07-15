import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { db } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  })
);

// --- auth middleware ---
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// --- auth routes ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(String(username).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.pw_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ user: user.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ user: req.session.username });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

// --- entries CRUD ---
app.get('/api/entries', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM entries').all();
  res.json(rows);
});

app.post('/api/entries', requireAuth, (req, res) => {
  const e = sanitizeEntry(req.body);
  if (!e.client) return res.status(400).json({ error: 'Client name is required' });
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO entries (client, type, date, status, owner, notes, created, updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(e.client, e.type, e.date, e.status, e.owner, e.notes, now, now);
  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.put('/api/entries/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const e = sanitizeEntry(req.body);
  if (!e.client) return res.status(400).json({ error: 'Client name is required' });
  db.prepare(
    `UPDATE entries SET client=?, type=?, date=?, status=?, owner=?, notes=?, updated=?
     WHERE id=?`
  ).run(e.client, e.type, e.date, e.status, e.owner, e.notes, new Date().toISOString(), id);
  res.json(db.prepare('SELECT * FROM entries WHERE id = ?').get(id));
});

app.delete('/api/entries/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM entries WHERE id = ?').run(id);
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

// --- serve built client in production ---
const clientDist = join(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API + app running at http://localhost:${PORT}`);
});
