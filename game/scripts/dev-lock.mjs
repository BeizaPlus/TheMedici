/**
 * Prevent two npm run dev sessions from free-dev-ports killing each other.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK_PATH = path.join(root, '.dev-server.lock');

export function isPidRunning(pid) {
  if (!pid || !Number.isFinite(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

export function readDevLock() {
  try {
    const raw = fs.readFileSync(LOCK_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isDevLockHeld() {
  const lock = readDevLock();
  return Boolean(lock?.pid && isPidRunning(lock.pid));
}

export function acquireDevLock() {
  const existing = readDevLock();
  if (existing?.pid && isPidRunning(existing.pid) && existing.pid !== process.pid) {
    return existing;
  }
  const lock = { pid: process.pid, startedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2));
  return null;
}

export function releaseDevLock() {
  try {
    const lock = readDevLock();
    if (lock?.pid === process.pid) fs.unlinkSync(LOCK_PATH);
  } catch {
    /* ignore */
  }
}
