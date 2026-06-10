/**
 * Free Schoonmaker dev ports (3001 API, 5173 Vite) before starting servers.
 * Prevents EADDRINUSE and Vite drifting to 5174+ (broken /api proxy, white page).
 */
import { execSync } from 'node:child_process';

const PORTS = [3001, 5173];

function pidsOnPort(port) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return out
      .split(/\r?\n/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
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
