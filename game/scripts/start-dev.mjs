/**
 * Start API + Vite only after smoke passes.
 * npm run dev → predev (data + smoke-test + smoke-pre-serve) → this script.
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
if (process.argv.includes('--no-hmr')) {
  process.env.VITE_DISABLE_HMR = '1';
}
const API = process.env.API_BASE || 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE || 'http://127.0.0.1:5173';
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const children = [];
const childLabels = new WeakMap();
let shuttingDown = false;

/** Local dev = API :3001 + Vite :5173. Never inherit cloud single-port mode. */
function devChildEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  delete env.SERVE_STATIC;
  env.PORT = '3001';
  env.SPORTMAKER_API_PORT = '3001';
  return env;
}

function describeExit(code) {
  if (code == null) return 'unknown';
  const n = Number(code);
  if (n === 0) return '0 (clean)';
  // Windows unsigned 32-bit for killed processes (e.g. 4294967295 → -1)
  if (n > 2000000000) return `${code} (process killed — port conflict or free-dev-ports?)`;
  return String(code);
}

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

function spawnServer(label, command, args, envOverrides = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: devChildEnv(envOverrides),
    shell: false,
  });
  childLabels.set(child, label);
  child.on('error', (err) => {
    if (!shuttingDown) console.error(`[${label}] ${err.message}`);
  });
  child.on('close', (code, signal) => {
    if (!shuttingDown) {
      console.error(
        `[${label}] exited (code ${describeExit(code)}${signal ? `, signal ${signal}` : ''})`,
      );
    }
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
    console.error('   If you see "static + API" on :5173, unset SERVE_STATIC in your shell or .env.');
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
  spawnServer('web', process.execPath, viteArgs, {
    PORT: '',
    SPORTMAKER_API_PORT: '',
  });

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

  console.log('\n--- Live smoke: welcome → case play + screenshots ---');
  const skipPlaySmoke =
    process.env.SKIP_PLAY_SMOKE === '1' || process.argv.includes('--no-hmr');
  if (skipPlaySmoke) {
    console.log('⏭ Skipping play-case browser smoke (study / SKIP_PLAY_SMOKE)\n');
  } else {
    try {
      await runNodeScript('scripts/smoke-play-case-session.mjs');
    } catch (e) {
      console.error(`❌ ${e.message}`);
      shutdown(1);
      return;
    }
  }

  console.log('\n✅ All smoke passed — serving at http://localhost:5173/\n');
  if (process.env.VITE_DISABLE_HMR === '1') {
    console.log('📚 Study mode: HMR off — refresh the browser when you want UI updates.\n');
  }
  console.log('Press Ctrl+C to stop.\n');

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  await Promise.race(
    children.map(
      (child) =>
        new Promise((resolve) => {
          child.on('close', (code) => resolve({ label: childLabels.get(child) || 'server', code }));
        }),
    ),
  );

  if (!shuttingDown) {
    console.error('\n❌ A dev server exited unexpectedly.');
    console.error('   Usually: port 3001/5173 conflict, SERVE_STATIC=1 in env, or API crash.');
    console.error('   Try: node scripts/free-dev-ports.mjs  then  npm run dev');
    shutdown(1);
  }
}

main().catch((e) => {
  console.error(e);
  shutdown(1);
});
