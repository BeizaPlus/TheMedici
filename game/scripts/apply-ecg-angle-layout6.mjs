#!/usr/bin/env node
/**
 * Incrementally merge CardioCard-angle layout (6) into bundled user layout.
 * Does not touch ecg-vector-lab.html — safe to re-run or pair with revert script.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = path.join(root, 'assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json');
const dstPath = path.join(root, 'assets/ecg-vector-lab-user-layout.json');
const backupPath = path.join(root, 'assets/ecg-vector-lab-user-layout.backup-pre-layout6.json');

const MERGE_KEYS = [
  'electrodes',
  'precordial',
  'scope',
  'heartAnchor',
  'heartPack',
  'heartScale',
  'scopeScale',
  'badgeScale',
  'badgeSpread',
  'bodyPlateScale',
  'autoMatchPlateBg',
  'axis',
  'heartRate',
  'vectorStroke',
  'playbackRate',
  'visibleLeads',
  'focusLead',
  'labelOffsets',
  'canvasPalette',
  'bottomStripCollapsed',
  'strip',
  'bodyPlateId',
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');
}

if (!fs.existsSync(srcPath)) {
  console.error('Missing source:', srcPath);
  process.exit(1);
}

const src = readJson(srcPath);
const dst = fs.existsSync(dstPath) ? readJson(dstPath) : { version: 3 };

if (!fs.existsSync(backupPath)) {
  writeJson(backupPath, dst);
  console.log('Created backup:', backupPath);
}

for (const key of MERGE_KEYS) {
  if (src[key] !== undefined) dst[key] = src[key];
}

dst.version = src.version || dst.version || 3;
dst.savedAt = src.savedAt || new Date().toISOString();
dst.note =
  'Merged from cardiocard-angle-layout.json (layout 6). Revert: node scripts/revert-ecg-angle-layout6.mjs';

dst.ui = { ...(dst.ui || {}), ...(src.ui || {}) };
dst.ui.bodyPlateId = 'cardiocard-angle';
dst.bodyPlateId = 'cardiocard-angle';

writeJson(dstPath, dst);
console.log('Applied layout 6 →', dstPath);
console.log('Reload lab → Controls → Reload bundled (or hard refresh).');
