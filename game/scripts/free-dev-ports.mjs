/**
 * Free Schoonmaker dev ports (3001 API, 5173 Vite) before starting servers.
 * Prevents EADDRINUSE and Vite drifting to 5174+ (broken /api proxy, white page).
 *
 * Uses netstat (not Get-NetTCPConnection) — PowerShell TCP queries can hang on Windows.
 */
import { execSync } from 'node:child_process';

const PORTS = [3001, 5173];

function pidsOnPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

let freed = 0;
for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    if (killPid(pid)) {
      console.log(`free-dev-ports: stopped PID ${pid} on :${port}`);
      freed += 1;
    }
  }
}

if (freed === 0) {
  console.log('free-dev-ports: :3001 and :5173 clear');
} else {
  console.log(`free-dev-ports: freed ${freed} process(es) — waiting 1s`);
  await new Promise((r) => setTimeout(r, 1000));
}
