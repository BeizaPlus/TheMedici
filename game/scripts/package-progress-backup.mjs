/**
 * Snapshot case progression for private repo / other-PC restore.
 * Run from game/: node scripts/package-progress-backup.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.join(__dirname, '..');
const USER_DATA = path.join(GAME_ROOT, 'user-data');
const OUT_ROOT = path.join(GAME_ROOT, 'progress-backup');
const OUT_USER = path.join(OUT_ROOT, 'user-data');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Skip missing: ${src}`);
    return 0;
  }
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDir(from, to);
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      count += 1;
    }
  }
  return count;
}

function dirSizeBytes(root) {
  if (!fs.existsSync(root)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(p);
    else total += fs.statSync(p).size;
  }
  return total;
}

const copied = copyDir(USER_DATA, OUT_USER);
const manifest = {
  packagedAt: new Date().toISOString(),
  source: 'game/user-data',
  caseFiles: fs.existsSync(path.join(OUT_USER, 'cases'))
    ? fs.readdirSync(path.join(OUT_USER, 'cases')).filter((f) => f.endsWith('.json')).length
    : 0,
  recordingFiles: fs.existsSync(path.join(OUT_USER, 'recordings'))
    ? fs.readdirSync(path.join(OUT_USER, 'recordings')).length
    : 0,
  totalFiles: copied,
  sizeMb: Math.round((dirSizeBytes(OUT_ROOT) / (1024 * 1024)) * 100) / 100,
  notes: [
    'Browser localStorage (timer, queue, differential log) lives in progress-backup/browser-localStorage.json',
    'Restore: node scripts/restore-progress-backup.mjs',
  ],
};

fs.writeFileSync(path.join(OUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Packaged ${copied} files → ${OUT_ROOT}`);
console.log(JSON.stringify(manifest, null, 2));
