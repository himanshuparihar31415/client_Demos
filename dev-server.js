// Local development runner: hosts the serverless Express app on a normal port,
// and serves the built client if it exists. On Vercel this file is unused —
// the app in api/index.js runs as a serverless function instead.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import app from './api/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, 'client', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});
