#!/usr/bin/env node
/**
 * Revert bundled user layout to pre–layout-6 backup.
 * Does not change ecg-vector-lab.html (CARDIOCARD_NORM / BODY_PLATE_LAYOUTS stay).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupPath = path.join(root, 'assets/ecg-vector-lab-user-layout.backup-pre-layout6.json');
const dstPath = path.join(root, 'assets/ecg-vector-lab-user-layout.json');
const angleLayoutPath = path.join(root, 'assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json');

if (!fs.existsSync(backupPath)) {
  console.error('No backup found:', backupPath);
  console.error('Restore from git: git show HEAD:game/assets/ecg-vector-lab-user-layout.json');
  process.exit(1);
}

fs.copyFileSync(backupPath, dstPath);
console.log('Restored', dstPath, 'from backup-pre-layout6');

if (process.argv.includes('--remove-angle-layout') && fs.existsSync(angleLayoutPath)) {
  fs.unlinkSync(angleLayoutPath);
  console.log('Removed', angleLayoutPath);
  console.log('Also remove cardiocard-angle from BODY_PLATE_LAYOUTS in ecg-vector-lab.html if needed.');
}

console.log('Reload lab → Controls → Reload bundled. Clear localStorage if electrodes still wrong.');
