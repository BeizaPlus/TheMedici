import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';
import { magnificImagePath } from '../server/magnificImage.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadGameEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const k = trimmed.slice(0, eq);
    if (!process.env[k]) process.env[k] = trimmed.slice(eq + 1).replace(/^"|"$/g, '');
  }
}

loadMasterEnv();
loadGameEnv();

const key = process.env.MAGNIFIC_API_KEY || process.env.MAGNIFIC_API_KEY_B2B || '';
console.log('MAGNIFIC_API_KEY set:', Boolean(key));

if (!key) {
  console.error('FAIL: Add MAGNIFIC_API_KEY=... to game/.env (one line, no spaces in name)');
  console.error('Get key: https://www.magnific.com/developers');
  process.exit(1);
}

const taskPath = magnificImagePath();
const r = await fetch(`https://api.magnific.com${taskPath}`, {
  method: 'POST',
  headers: {
    'x-magnific-api-key': key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),
}).catch((e) => ({ ok: false, status: 0, text: () => Promise.resolve(String(e)) }));

const body = typeof r.text === 'function' ? await r.text() : '';

if (r.status === 401) {
  console.error('FAIL: Magnific rejected API key (401 Unauthorized)');
  process.exit(1);
}

if (r.status === 403) {
  console.error('FAIL: Magnific API plan may not include REST (403). Need Business+ or use MCP OAuth.');
  process.exit(1);
}

if (r.status === 400 && body.includes('prompt')) {
  console.log('OK: Magnific REST key accepted (auth passed; validation error expected on empty body)');
  console.log('Image model path:', taskPath);
  process.exit(0);
}

if (r.ok) {
  console.log('OK: Magnific REST reachable');
  process.exit(0);
}

console.error('FAIL: Unexpected Magnific response', r.status, body.slice(0, 240));
process.exit(1);
