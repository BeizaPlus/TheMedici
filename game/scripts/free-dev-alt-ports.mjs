/**
 * Free alternate dev ports only (:3002 API, :5174 Vite) — never touches study :3001 / :5173.
 */
import { execSync } from 'node:child_process';

const PORTS = [
  Number(process.env.SPORTMAKER_API_PORT || 3002),
  Number(process.env.VITE_DEV_PORT || 5174),
];

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
      console.log(`free-dev-alt-ports: stopped PID ${pid} on :${port}`);
      freed += 1;
    }
  }
}

if (freed === 0) {
  console.log(`free-dev-alt-ports: :${PORTS.join(' and :')} clear`);
} else {
  console.log(`free-dev-alt-ports: freed ${freed} process(es) — waiting 1s`);
  await new Promise((r) => setTimeout(r, 1000));
}
