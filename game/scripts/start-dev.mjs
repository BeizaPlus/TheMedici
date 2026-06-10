/**
 * Start API + Vite only after smoke passes.
 * npm run dev → predev (data + smoke-test + smoke-pre-serve) → this script.
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const API = process.env.API_BASE || 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE || 'http://127.0.0.1:5173';
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const children = [];
let shuttingDown = false;

function runNodeScript(rel) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, rel)], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${rel} failed (exit ${code ?? 1})`));
    });
  });
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

function spawnServer(label, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  child.on('error', (err) => {
    if (!shuttingDown) console.error(`[${label}] ${err.message}`);
  });
  children.push(child);
  return child;
}

function shutdown(code = 1) {
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
  console.log('=== Start dev (smoke-gated) ===\n');

  spawnSync(process.execPath, [path.join(root, 'scripts/free-dev-ports.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });

  console.log('\n--- Starting API ---');
  spawnServer('api', process.execPath, ['server/index.js']);

  if (!(await waitForUrl(`${API}/api/health`))) {
    console.error('❌ API did not become ready on :3001');
    shutdown(1);
    return;
  }
  console.log('✅ API ready\n');

  console.log('--- Live smoke: differential API ---');
  try {
    await runNodeScript('scripts/validate-diff-smoke.mjs');
  } catch (e) {
    console.error(`❌ ${e.message}`);
    shutdown(1);
    return;
  }

  console.log('\n--- Starting Vite ---');
  const viteArgs = process.argv.includes('--studio')
    ? [viteBin, '--open', '/studio.html']
    : [viteBin];
  spawnServer('web', process.execPath, viteArgs);

  if (!(await waitForUrl(`${WEB}/`))) {
    console.error('❌ Vite did not become ready on :5173');
    shutdown(1);
    return;
  }
  console.log('✅ Vite ready\n');

  console.log('--- Live smoke: differential session + screenshots ---');
  try {
    await runNodeScript('scripts/smoke-differential-session.mjs');
  } catch (e) {
    console.error(`❌ ${e.message}`);
    shutdown(1);
    return;
  }

  console.log('\n✅ All smoke passed — serving at http://localhost:5173/\n');
  console.log('Press Ctrl+C to stop.\n');

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  await Promise.race(
    children.map(
      (child) =>
        new Promise((resolve) => {
          child.on('close', (code) => resolve(code));
        }),
    ),
  );

  if (!shuttingDown) {
    console.error('\n❌ A dev server exited unexpectedly.');
    shutdown(1);
  }
}

main().catch((e) => {
  console.error(e);
  shutdown(1);
});
