#!/usr/bin/env node
/**
 * Merge CardioCard-angle layout 7 into bundled user layout.
 * Source: assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json
 * Optional: node scripts/apply-ecg-angle-layout7.mjs "C:\path\to\export.json"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultSrc = path.join(root, 'assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json');
const srcPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultSrc;
const dstPath = path.join(root, 'assets/ecg-vector-lab-user-layout.json');
const backupPath = path.join(root, 'assets/ecg-vector-lab-user-layout.backup-pre-layout7.json');
const angleLayoutPath = defaultSrc;

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
  'bodyViewZoom',
  'bodyViewPanX',
  'bodyViewPanY',
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

/* Bundled boot: all leads visible (export may have isolate session state) */
dst.visibleLeads = {
  I: true,
  II: true,
  III: true,
  aVR: true,
  aVL: true,
  aVF: true,
};
if (!dst.focusLead || dst.focusLead === 'III') dst.focusLead = 'II';

dst.version = src.version || dst.version || 3;
dst.savedAt = src.savedAt || new Date().toISOString();
dst.note =
  'Layout 7 — CardioCard angle electrodes. Revert: node scripts/revert-ecg-angle-layout7.mjs';

dst.ui = { ...(dst.ui || {}), ...(src.ui || {}) };
delete dst.ui.controlsSections;
dst.ui.bodyPlateId = 'cardiocard-angle';
dst.bodyPlateId = 'cardiocard-angle';

writeJson(dstPath, dst);
writeJson(angleLayoutPath, { ...src, ...dst, note: dst.note, visibleLeads: dst.visibleLeads, focusLead: dst.focusLead });

console.log('Applied layout 7 →', dstPath);
console.log('Updated angle layout →', angleLayoutPath);
console.log('Reload lab → Controls → Reload bundled (or hard refresh). Clear :5173 localStorage if markers stick.');
