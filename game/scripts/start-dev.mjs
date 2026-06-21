/**
 * Start API + Vite only after smoke passes.
 * npm run dev → predev (data + smoke-test + smoke-pre-serve) → this script.
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireDevLock, releaseDevLock } from './dev-lock.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
if (process.argv.includes('--no-hmr')) {
  process.env.VITE_DISABLE_HMR = '1';
}
const API = process.env.API_BASE || 'http://127.0.0.1:3001';
const WEB = process.env.WEB_BASE || 'http://127.0.0.1:5173';
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const MAX_RESTARTS = 8;
const RESTART_WINDOW_MS = 120_000;

const children = [];
const childLabels = new WeakMap();
const restartLog = { api: [], web: [] };
let shuttingDown = false;
let smokeComplete = false;
let apiChild = null;
let webChild = null;

// Double-clicked .bat closes stdin on Windows → inherited Vite/API children exit.
if (process.platform === 'win32') {
  try {
    process.stdin.resume();
  } catch {
    /* ignore */
  }
}

/** Local dev = API :3001 + Vite :5173. Never inherit cloud single-port mode. */
function devChildEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  delete env.SERVE_STATIC;
  if (overrides.PORT === '') {
    delete env.PORT;
    env.SPORTMAKER_API_PORT = '3001';
  } else {
    env.PORT = '3001';
    env.SPORTMAKER_API_PORT = '3001';
  }
  return env;
}

function describeExit(code) {
  if (code == null) return 'unknown';
  const n = Number(code);
  if (n === 0) return '0 (clean)';
  if (n > 2000000000) return `${code} (process killed — port conflict or second dev window?)`;
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

function spawnServer(label, command, args, envOverrides = {}, respawn = null) {
  const child = spawn(command, args, {
    cwd: root,
    // stdin: ignore — Vite exits when batch-file stdin EOFs on Windows after smoke.
    stdio: ['ignore', 'inherit', 'inherit'],
    env: devChildEnv(envOverrides),
    shell: false,
    windowsHide: false,
  });
  childLabels.set(child, label);
  children.push(child);
  if (respawn) attachSupervisor(child, label, respawn);
  return child;
}

function spawnApiServer() {
  apiChild = spawnServer('api', process.execPath, ['server/index.js'], {}, spawnApiServer);
  return apiChild;
}

function spawnWebServer() {
  const viteArgs = process.argv.includes('--studio')
    ? [viteBin, '--open', '/studio.html']
    : [viteBin];
  webChild = spawnServer('web', process.execPath, viteArgs, {
    PORT: '',
    SPORTMAKER_API_PORT: '',
  }, spawnWebServer);
  return webChild;
}

function recentRestartCount(label) {
  const now = Date.now();
  restartLog[label] = restartLog[label].filter((t) => now - t < RESTART_WINDOW_MS);
  return restartLog[label].length;
}

function attachSupervisor(child, label, respawn) {
  child.on('close', (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[${label}] exited (code ${describeExit(code)}${signal ? `, signal ${signal}` : ''})`,
    );
    if (!smokeComplete) {
      console.error(`❌ [${label}] died during smoke — dev start aborted.`);
      shutdown(1);
      return;
    }
    if (recentRestartCount(label) >= MAX_RESTARTS) {
      console.error(
        `\n❌ [${label}] crashed ${MAX_RESTARTS} times in ${RESTART_WINDOW_MS / 1000}s — stopping dev.`,
      );
      console.error('   Common causes: second START-GAME.bat window, port conflict, API crash.');
      console.error('   Try: close other dev terminals → node scripts/free-dev-ports.mjs → npm run dev');
      shutdown(1);
      return;
    }
    restartLog[label].push(Date.now());
    const n = restartLog[label].length;
    console.log(`\n↻ [${label}] restarting in 1s (${n}/${MAX_RESTARTS})…`);
    setTimeout(() => {
      void restartChild(label, respawn);
    }, 1000);
  });
}

async function restartChild(label, respawn) {
  if (shuttingDown) return;
  respawn();
  const ready =
    label === 'api'
      ? await waitForUrl(`${API}/api/health`, 45_000)
      : await waitForUrl(`${WEB}/`, 45_000);
  if (ready) {
    console.log(`✅ [${label}] back online\n`);
    return;
  }
  console.error(`❌ [${label}] did not come back after restart`);
}

function shutdown(code = 1) {
  if (shuttingDown) return;
  shuttingDown = true;
  releaseDevLock();
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
  const blocked = acquireDevLock();
  if (blocked) {
    console.error('❌ Another dev session is already running.');
    console.error(`   PID ${blocked.pid} · started ${blocked.startedAt || 'unknown'}`);
    console.error('   Use http://localhost:5173/ or close the other terminal before starting again.');
    process.exit(1);
  }
  process.on('exit', releaseDevLock);

  console.log('=== Start dev (smoke-gated) ===\n');

  spawnSync(process.execPath, [path.join(root, 'scripts/free-dev-ports.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });

  console.log('\n--- Starting API ---');
  spawnApiServer();

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
  spawnWebServer();

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
    process.env.SKIP_PLAY_SMOKE === '1' || process.argv.includes('--skip-play-smoke');
  if (skipPlaySmoke) {
    console.log('⏭ Skipping play-case browser smoke (SKIP_PLAY_SMOKE / --skip-play-smoke)\n');
  } else {
    try {
      await runNodeScript('scripts/smoke-play-case-session.mjs');
    } catch (e) {
      console.error(`❌ ${e.message}`);
      shutdown(1);
      return;
    }
  }

  smokeComplete = true;

  console.log('\n✅ All smoke passed — serving at http://localhost:5173/\n');
  if (process.env.VITE_DISABLE_HMR === '1') {
    console.log('📚 Study mode: HMR off — refresh the browser when you want UI updates.');
    console.log('   Screenshot smoke still ran (welcome, play, Continue, Whys, uber U01).\n');
  }
  console.log('Keep this window open. Do not start a second START-GAME.bat (it kills ports).');
  console.log('Press Ctrl+C to stop.\n');

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  await new Promise(() => {
    /* stay alive until shutdown */
  });
}

main().catch((e) => {
  console.error(e);
  shutdown(1);
});
