import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'app.db');

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    pw_hash  TEXT NOT NULL,
    created  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    client  TEXT NOT NULL,
    type    TEXT NOT NULL,
    date    TEXT,
    status  TEXT NOT NULL,
    owner   TEXT,
    notes   TEXT,
    created TEXT NOT NULL,
    updated TEXT NOT NULL
  );
`);

// Seed a couple of demo users on first run (passwords are hashed).
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (userCount === 0) {
  const now = new Date().toISOString();
  const insert = db.prepare(
    'INSERT INTO users (username, pw_hash, created) VALUES (?, ?, ?)'
  );
  insert.run('admin', bcrypt.hashSync('demo1234', 10), now);
  insert.run('ujjwal', bcrypt.hashSync('pilot2026', 10), now);
  console.log('Seeded demo users: admin / ujjwal');
}

// Seed sample entries on first run.
const entryCount = db.prepare('SELECT COUNT(*) AS n FROM entries').get().n;
if (entryCount === 0) {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO entries (client, type, date, status, owner, notes, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seed = [
    ['A10', 'Demo', '2026-07-10', 'Completed', 'Ujjwal', 'First conversation happened on 10th July; demo also given same day.'],
    ['Syneos', 'Demo', '2026-07-20', 'Scheduled', '', ''],
    ['Seven Eleven', 'Demo', '2026-07-26', 'Scheduled', '', ''],
    ['US Bank', 'Demo', '', 'Pending', '', 'ETA not available yet.'],
    ['Legrand', 'Internal / Automation', '', 'Requested', '', 'Wants an automation pipeline for creating test plans.'],
  ];
  for (const row of seed) insert.run(...row, now, now);
  console.log('Seeded sample entries');
}
