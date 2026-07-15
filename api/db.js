import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

// Uses Turso (libSQL) in production, a local file in development.
// - Production (Vercel): set TURSO_DATABASE_URL (libsql://...) + TURSO_AUTH_TOKEN
// - Local dev: defaults to a file next to the project (dev.db)
const url = process.env.TURSO_DATABASE_URL || 'file:dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient(authToken ? { url, authToken } : { url });

let ready = null;
export function initDb() {
  if (!ready) ready = setup();
  return ready;
}

async function setup() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      pw_hash  TEXT NOT NULL,
      created  TEXT NOT NULL
    )
  `);
  await db.execute(`
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
    )
  `);

  const now = new Date().toISOString();

  const userCount = await db.execute('SELECT COUNT(*) AS n FROM users');
  if (Number(userCount.rows[0].n) === 0) {
    await db.execute({
      sql: 'INSERT INTO users (username, pw_hash, created) VALUES (?, ?, ?)',
      args: ['admin', bcrypt.hashSync('demo1234', 10), now],
    });
    await db.execute({
      sql: 'INSERT INTO users (username, pw_hash, created) VALUES (?, ?, ?)',
      args: ['ujjwal', bcrypt.hashSync('pilot2026', 10), now],
    });
  }

  const entryCount = await db.execute('SELECT COUNT(*) AS n FROM entries');
  if (Number(entryCount.rows[0].n) === 0) {
    const seed = [
      ['A10', 'Demo', '2026-07-10', 'Completed', 'Ujjwal', 'First conversation happened on 10th July; demo also given same day.'],
      ['Syneos', 'Demo', '2026-07-20', 'Scheduled', '', ''],
      ['Seven Eleven', 'Demo', '2026-07-26', 'Scheduled', '', ''],
      ['US Bank', 'Demo', '', 'Pending', '', 'ETA not available yet.'],
      ['Legrand', 'Internal / Automation', '', 'Requested', '', 'Wants an automation pipeline for creating test plans.'],
    ];
    for (const row of seed) {
      await db.execute({
        sql: `INSERT INTO entries (client, type, date, status, owner, notes, created, updated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [...row, now, now],
      });
    }
  }
}
