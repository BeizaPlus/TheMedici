#!/usr/bin/env node
/**
 * Restore bundled layout from backup-pre-layout8.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupPath = path.join(root, 'assets/ecg-vector-lab-user-layout.backup-pre-layout8.json');
const dstPath = path.join(root, 'assets/ecg-vector-lab-user-layout.json');
const angleLayoutPath = path.join(root, 'assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json');

if (!fs.existsSync(backupPath)) {
  console.error('No backup found:', backupPath);
  console.error('Try: node scripts/revert-ecg-angle-layout7.mjs');
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
fs.writeFileSync(dstPath, JSON.stringify(backup, null, 2) + '\n', 'utf8');
fs.writeFileSync(angleLayoutPath, JSON.stringify(backup, null, 2) + '\n', 'utf8');
console.log('Reverted layout 8 →', dstPath);
