// Very light data store for entries.
// - Local dev: a plain JSON file (data/store.json), created on first use.
// - Production (Vercel): a single JSON value in Vercel KV / Upstash Redis,
//   since Vercel has no writable persistent disk.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Vercel's storage integrations may prefix the injected env vars with the store
// name (e.g. client_demo_KV_REST_API_URL). Match by suffix so any prefix works.
function findEnv(suffix) {
  if (process.env[suffix]) return process.env[suffix];
  const key = Object.keys(process.env).find((k) => k.endsWith(suffix) && process.env[k]);
  return key ? process.env[key] : undefined;
}

const KV_URL = findEnv('KV_REST_API_URL') || findEnv('UPSTASH_REDIS_REST_URL');
const KV_TOKEN = findEnv('KV_REST_API_TOKEN') || findEnv('UPSTASH_REDIS_REST_TOKEN');
const useKV = !!(KV_URL && KV_TOKEN);
const ON_VERCEL = !!process.env.VERCEL; // read-only filesystem, no local file possible
const KEY = 'entries';

const NO_STORAGE_MSG =
  'No storage is connected. Add a Vercel KV (Upstash) store to this project and redeploy so changes can be saved.';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '..', 'data', 'store.json');

const SEED = [
  { id: 1, client: 'A10', type: 'Demo', date: '2026-07-10', status: 'Completed', owner: 'Ujjwal', notes: 'First conversation happened on 10th July; demo also given same day.' },
  { id: 2, client: 'Syneos', type: 'Demo', date: '2026-07-20', status: 'Scheduled', owner: '', notes: '' },
  { id: 3, client: 'Seven Eleven', type: 'Demo', date: '2026-07-26', status: 'Scheduled', owner: '', notes: '' },
  { id: 4, client: 'US Bank', type: 'Demo', date: '', status: 'Pending', owner: '', notes: 'ETA not available yet.' },
  { id: 5, client: 'Legrand', type: 'Internal / Automation', date: '', status: 'Requested', owner: '', notes: 'Wants an automation pipeline for creating test plans.' },
];

let _redis = null;
async function redis() {
  if (!_redis) {
    const { Redis } = await import('@upstash/redis');
    _redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  }
  return _redis;
}

export async function getEntries() {
  if (useKV) {
    const r = await redis();
    let data = await r.get(KEY);
    if (!data) {
      data = SEED;
      await r.set(KEY, data);
    }
    return data;
  }
  // On Vercel with no KV connected there is no writable disk — show seed data
  // read-only rather than crashing, and let saves report a clear error.
  if (ON_VERCEL) return SEED;
  if (!existsSync(FILE)) {
    await mkdir(dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(SEED, null, 2));
    return SEED;
  }
  return JSON.parse(await readFile(FILE, 'utf8'));
}

export async function saveEntries(entries) {
  if (useKV) {
    const r = await redis();
    await r.set(KEY, entries);
    return;
  }
  if (ON_VERCEL) {
    const err = new Error(NO_STORAGE_MSG);
    err.status = 503;
    throw err;
  }
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(entries, null, 2));
}
