#!/usr/bin/env node
/**
 * Revert bundled user layout to pre–layout-7 backup.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupPath = path.join(root, 'assets/ecg-vector-lab-user-layout.backup-pre-layout7.json');
const layout6Backup = path.join(root, 'assets/ecg-vector-lab-user-layout.backup-pre-layout6.json');
const dstPath = path.join(root, 'assets/ecg-vector-lab-user-layout.json');

const restoreFrom = fs.existsSync(backupPath)
  ? backupPath
  : fs.existsSync(layout6Backup)
    ? layout6Backup
    : null;

if (!restoreFrom) {
  console.error('No backup found. Try: git show HEAD:game/assets/ecg-vector-lab-user-layout.json');
  process.exit(1);
}

fs.copyFileSync(restoreFrom, dstPath);
console.log('Restored', dstPath, 'from', path.basename(restoreFrom));
console.log('Reload lab → Controls → Reload bundled. Clear localStorage if needed.');
