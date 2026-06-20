#!/usr/bin/env node
/** Request 2×3 storyboard grid via API (Magnific). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.MEWORLD_API || 'http://127.0.0.1:3002';
const caseId = process.argv[2] || '153';
const root = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.resolve(root, '..');
const storyJson = path.join(gameRoot, '.case-story-cache', `case_${String(caseId).padStart(3, '0')}.json`);
const cached = JSON.parse(fs.readFileSync(storyJson, 'utf8'));

const res = await fetch(`${API}/api/case-story-storyboard`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    caseId,
    chapters: cached.chapters,
    patientLock: cached.patientLock,
    portraitNote: cached.patientLock,
    refresh: true,
    generateImages: true,
    gridPlate: true,
  }),
});
const data = await res.json();
if (!res.ok) {
  console.error(data.error || res.status);
  process.exit(1);
}
console.log('Grid:', data.gridImageUrl || '(none)');
console.log('Beats:', (data.beats || []).length);
