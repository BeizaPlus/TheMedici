/**
 * Study snapshot on alternate ports — leaves main dev on :5173 / :3001 alone.
 *
 *   npm run dev:study:alt
 *   → API :3002 · Vite :5174 · HMR off · http://localhost:5174/
 *
 * Run from MeWorld-study\game (frozen snapshot), not main MeWorld\game.
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const API_PORT = process.env.SPORTMAKER_API_PORT || '3002';
const VITE_PORT = process.env.VITE_DEV_PORT || '5174';
const API = `http://127.0.0.1:${API_PORT}`;
const WEB = `http://127.0.0.1:${VITE_PORT}`;

const children = [];
let shuttingDown = false;

function devChildEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  delete env.SERVE_STATIC;
  env.SPORTMAKER_API_PORT = API_PORT;
  env.VITE_API_PORT = API_PORT;
  env.VITE_DEV_PORT = VITE_PORT;
  env.VITE_STRICT_PORT = '1';
  env.VITE_DISABLE_HMR = '1';
  if (overrides.PORT === '') {
    delete env.PORT;
  } else {
    env.PORT = API_PORT;
  }
  return env;
}

async function waitForUrl(url, ms = 90000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(code), 300);
}

async function main() {
  console.log('=== MeWorld STUDY (alt ports — main :5173 untouched) ===\n');
  console.log(`Study API :${API_PORT} · Vite :${VITE_PORT} · HMR off`);
  console.log(`Open: ${WEB}/\n`);

  spawnSync(process.execPath, [path.join(root, 'scripts/free-dev-alt-ports.mjs')], {
    cwd: root,
    stdio: 'inherit',
    env: devChildEnv(),
  });

  console.log('--- Starting study API ---');
  const apiChild = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: devChildEnv(),
  });
  children.push(apiChild);

  apiChild.on('close', (code) => {
    if (shuttingDown) return;
    console.error(`[study-api] exited (code ${code ?? 1})`);
    shutdown(1);
  });

  if (!(await waitForUrl(`${API}/api/health`))) {
    console.error(`❌ Study API did not become ready on :${API_PORT}`);
    shutdown(1);
    return;
  }
  console.log('✅ Study API ready\n');

  console.log('--- Starting study Vite ---');
  const webChild = spawn(process.execPath, [viteBin, '--port', VITE_PORT, '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: devChildEnv({ PORT: '' }),
  });
  children.push(webChild);

  webChild.on('close', (code) => {
    if (shuttingDown) return;
    console.error(`[study-web] exited (code ${code ?? 1})`);
    shutdown(1);
  });

  if (!(await waitForUrl(`${WEB}/`))) {
    console.error(`❌ Study Vite did not become ready on :${VITE_PORT}`);
    shutdown(1);
    return;
  }

  console.log(`\n✅ Study ready — ${WEB}/`);
  console.log(`   API ${API}/api/health`);
  console.log('   HMR off — refresh manually after snapshot code changes.');
  console.log('   Main dev can stay on http://localhost:5173/');
  console.log('   Press Ctrl+C to stop study only.\n');

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  await new Promise(() => {
    /* stay alive */
  });
}

main().catch((e) => {
  console.error(e);
  shutdown(1);
});
