/**
 * Capture browser localStorage from running dev server → progress-backup/browser-localStorage.json
 * Requires app at http://127.0.0.1:5173 (or VITE port). Run: node scripts/capture-browser-progress.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'progress-backup', 'browser-localStorage.json');
const BASE = process.env.MEWORLD_URL || 'http://127.0.0.1:5173';

const KEYS = [
  'schoonmaker_progress',
  'schoonmaker_audience_profile',
  'schoonmaker_ui_prefs',
  'schoonmaker_active_play_checkpoint',
  'schoonmaker_differential_practice_log',
  'schoonmaker_differential_case_transcripts',
  'schoonmaker_differential_stacker_prefs',
  'schoonmaker_differential_voice_index',
  'schoonmaker_differential_case_memory',
  'schoonmaker_case_simulation_creativity',
  'schoonmaker_case_chat_history',
  'schoonmaker_case_notes',
  'schoonmaker_play_session_timeline',
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(800);
    const payload = await page.evaluate((keyList) => {
      const keys = {};
      for (const k of keyList) {
        const v = localStorage.getItem(k);
        if (v != null) keys[k] = v;
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('schoonmaker_soap_draft_') ||
            k.startsWith('schoonmaker_play_session_timeline_')) &&
          keys[k] == null
        ) {
          keys[k] = localStorage.getItem(k);
        }
      }
      return { exportedAt: new Date().toISOString(), origin: location.origin, keys };
    }, KEYS);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${Object.keys(payload.keys).length} keys → ${OUT}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  console.error(`Open ${BASE}/progress-export.html manually if dev server uses different storage.`);
  process.exit(1);
});
