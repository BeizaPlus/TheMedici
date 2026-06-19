/**
 * Smoke: case 181 (Pediatrics) uses ped baseplate + exit returns to briefing.
 * Screenshots for study-mode verification.
 *
 * Prereq: npm run dev (study folder)
 *   cd MeWorld-study/game && npm run dev
 *   node scripts/smoke-pediatric-181.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRenderable } from './smoke-screen-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WEB = process.env.WEB_BASE || 'http://127.0.0.1:5173';

function shotDir() {
  const day = new Date().toISOString().slice(0, 10);
  const run = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const dir = path.join(root, 'docs', 'smoke-screenshots', day, 'pediatric-181', `run-${run}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const OUT = shotDir();
let seq = 0;
let fail = 0;

function ok(cond, name, detail = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fail += 1;
  return cond;
}

async function shot(page, name) {
  const file = path.join(OUT, `${String(++seq).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`   📸 ${path.relative(root, file)}`);
  return file;
}

async function waitForServer(url, ms = 20000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function dismissOnboarding(page) {
  const btn = page.getByRole('button', { name: /continue as physician/i });
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(800);
  }
}

async function main() {
  ok(await waitForServer(WEB), 'Vite dev server', WEB);
  if (fail) process.exit(1);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1536, height: 900 } });

  await page.goto(`${WEB}/?case=181`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(600);
  await dismissOnboarding(page);

  await page.waitForSelector('main.briefing, .briefing-with-scene', { timeout: 30000 });
  await shot(page, 'briefing-181');
  ok(
    (await page.locator('.briefing-case, .briefing-title').first().textContent())?.includes('181'),
    'briefing shows case 181',
  );

  const begin = page.getByRole('button', { name: /begin case/i });
  ok(await begin.isVisible({ timeout: 8000 }), 'Begin case visible');
  await begin.click();
  await page.waitForSelector('.game-scene, div.game', { timeout: 90000 });
  await page.waitForSelector('.game-scene img.patient-scene-img', { timeout: 30000 });
  await page.waitForTimeout(2000);
  await assertRenderable(page, ok, 'play scene 181');
  await shot(page, 'play-181-scene');

  const imgSrc = await page.locator('.game-scene img.patient-scene-img').first().getAttribute('src');
  ok(
    imgSrc?.includes('ped-male') || imgSrc?.includes('ped-female') || imgSrc?.includes('case-portraits'),
    'patient image is pediatric or case portrait',
    imgSrc || 'no src',
  );
  ok(!imgSrc?.includes('patient-scene.png') || imgSrc?.includes('ped'), 'not generic adult male plate', imgSrc);

  // Exit → briefing (not welcome home)
  page.once('dialog', (d) => d.accept());
  await page.locator('.panel-exit-btn').click();
  await page.waitForSelector('main.briefing, .briefing-with-scene', { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, 'after-exit-briefing');
  ok(
    await page.locator('main.briefing, .briefing-with-scene').first().isVisible(),
    'exit returns to briefing preview',
  );
  ok(!(await page.locator('.welcome-title').isVisible().catch(() => false)), 'not on welcome home');

  // Browse context persisted
  const ctx = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('schoonmaker_case_browse_context') || 'null');
    } catch {
      return null;
    }
  });
  ok(ctx?.categoryId === 'Pediatrics' || ctx?.caseId === '181', 'browse context saved', JSON.stringify(ctx));

  await browser.close();
  console.log(`\nScreenshots: ${OUT}`);
  console.log(fail ? `FAILED (${fail} checks)` : 'ALL CHECKS PASSED');
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
