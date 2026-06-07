/**
 * Restore progress-backup/ → game/user-data/ on another PC.
 * Run from game/: node scripts/restore-progress-backup.mjs
 * Then import browser-localStorage.json via progress-import.html
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.join(__dirname, '..');
const BACKUP = path.join(GAME_ROOT, 'progress-backup', 'user-data');
const USER_DATA = path.join(GAME_ROOT, 'user-data');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Missing backup: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) count += copyDir(from, to);
    else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      count += 1;
    }
  }
  return count;
}

const n = copyDir(BACKUP, USER_DATA);
console.log(`Restored ${n} files → ${USER_DATA}`);
console.log('Next: open http://localhost:5173/progress-import.html and load progress-backup/browser-localStorage.json');
