/**
 * Smoke Uber U01–U08 wired GAME-SCENE preview plates — screenshots before study snapshot.
 *
 *   npm run dev   (main game, not study)
 *   node scripts/smoke-uber-preview-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import uberCases from '../src/data/uberCases.json' with { type: 'json' };
import uberRefs from '../src/data/patientUberRefs.json' with { type: 'json' };
import { assertRenderable } from './smoke-screen-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/** Probe asset that exists only on main game after uber ship (study snapshot may lack it). */
const MAIN_GAME_PROBE = '/assets/patient/uber/subway-afro-dandy-GAME-SCENE.png';

function shotDir() {
  const day = new Date().toISOString().slice(0, 10);
  const run = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const dir = path.join(root, 'docs', 'smoke-screenshots', day, 'uber-preview', `run-${run}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

let OUT_DIR = shotDir();
let fail = 0;

function ok(cond, name, detail = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fail += 1;
  return cond;
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

/** Prefer a Vite port that serves wired uber GAME-SCENE assets (main game, not study on :5173). */
async function resolveMainGameWebBase() {
  if (process.env.WEB_BASE) {
    const base = process.env.WEB_BASE.replace(/\/$/, '');
    const probe = await fetch(`${base}${MAIN_GAME_PROBE}`).catch(() => null);
    if (probe?.ok) return base;
    console.warn(`⚠️  WEB_BASE=${base} does not serve ${MAIN_GAME_PROBE} — scanning 5173–5175`);
  }

  for (const port of [5173, 5174, 5175]) {
    for (const host of ['127.0.0.1', 'localhost']) {
      const base = `http://${host}:${port}`;
      const rootOk = await waitForServer(`${base}/`, 3000);
      if (!rootOk) continue;
      try {
        const r = await fetch(`${base}${MAIN_GAME_PROBE}`);
        if (r.ok) return base;
      } catch {
        /* next */
      }
    }
  }
  return null;
}

async function dismissOnboarding(page) {
  const cta = page.getByRole('button', { name: /Continue as physician/i });
  if (await cta.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cta.click();
    await page.waitForTimeout(500);
  }
}

async function getPreviewImageSrc(page) {
  return page.evaluate(() => {
    const img =
      document.querySelector('img.briefing-scene-img') ||
      document.querySelector('img.patient-scene-img') ||
      document.querySelector('.case-detail-scene-img img') ||
      document.querySelector('.game-scene img') ||
      document.querySelector('img[src*="patient/uber"]') ||
      document.querySelector('img[src*="patient/pediatric"]');
    return img?.getAttribute('src') || null;
  });
}

async function captureUberCase(page, caseId, webBase) {
  const meta = uberCases.cases.find((c) => c.id === caseId);
  const slug = uberRefs.caseSlugs?.[caseId];
  const ref = slug ? uberRefs.refs?.[slug] : null;
  const expectedFile = ref?.gameSceneFile || `${slug}-GAME-SCENE.png`;
  const expectedFragment = `/assets/patient/uber/${expectedFile}`;

  await page.goto(`${webBase}/?case=${caseId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissOnboarding(page);
  await page.waitForSelector('.game-scene, main.briefing, .briefing-with-scene', { timeout: 60000 });
  await page.waitForTimeout(2000);

  await assertRenderable(page, ok, `${caseId} renderable`);

  const src = await getPreviewImageSrc(page);
  const usesWiredPlate = Boolean(src && src.includes(expectedFragment));
  ok(usesWiredPlate, `${caseId} preview src`, src || 'no img');

  const publicPath = path.join(root, 'public', expectedFragment.replace(/^\//, ''));
  ok(fs.existsSync(publicPath), `${caseId} public file`, publicPath);

  const shotPath = path.join(OUT_DIR, `${caseId}-${slug || 'unknown'}-briefing.png`);
  await page.screenshot({ path: shotPath, fullPage: false });
  const kb = Math.round(fs.statSync(shotPath).size / 1024);
  console.log(`   📸 ${shotPath} (${kb} KB)`);

  return { caseId, slug, patientName: meta?.patientName, src, shotPath, usesWiredPlate };
}

async function main() {
  console.log('=== Uber preview smoke (screenshots) ===\n');
  console.log(`Output: ${OUT_DIR}\n`);

  const webBase = await resolveMainGameWebBase();
  if (!webBase) {
    console.error(
      '❌ No Vite on 5173–5175 serves wired uber GAME-SCENE assets.\n' +
        '   Start main MeWorld\\game (not study): npm run dev\n' +
        '   Or: node node_modules/vite/bin/vite.js --port 5174\n' +
        '   Study on :5173 alone will fail until create-study-snapshot.ps1 syncs main.',
    );
    process.exit(1);
  }
  ok(true, 'main game vite (uber assets)', webBase);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem(
      'schoonmaker_audience_profile',
      JSON.stringify({
        level: 'advanced',
        condition: 'diabetes',
        playRole: 'doctor',
        difficulty: 'standard',
        timerSeconds: 150,
      }),
    );
  });
  const page = await context.newPage();

  const ids = uberCases.cases.map((c) => c.id);
  const results = [];
  for (const caseId of ids) {
    console.log(`\n--- ${caseId} ---`);
    results.push(await captureUberCase(page, caseId, webBase));
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, 'SMOKE_REPORT.md');
  const lines = [
    '# Uber preview smoke report',
    '',
    `**Run:** ${new Date().toISOString()}`,
    `**Web:** ${webBase}`,
    '',
    '| Case | Patient | Slug | Wired plate | Screenshot |',
    '|------|---------|------|-------------|------------|',
    ...results.map(
      (r) =>
        `| ${r.caseId} | ${r.patientName || '—'} | \`${r.slug}\` | ${r.usesWiredPlate ? '✅' : '❌'} | \`${path.basename(r.shotPath)}\` |`,
    ),
    '',
    fail ? `**Result:** ❌ ${fail} check(s) failed` : '**Result:** ✅ All Uber previews wired',
    '',
    'After pass: `powershell -File C:\\Users\\steve\\MeWorld\\scripts\\create-study-snapshot.ps1`',
    '',
  ];
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);

  if (fail) {
    console.log(`\n❌ ${fail} check(s) failed\n`);
    process.exit(1);
  }
  console.log('\n✅ Uber preview smoke passed — safe to study snapshot after your visual review.\n');
  try {
    const { spawn } = await import('node:child_process');
    spawn('explorer.exe', [OUT_DIR], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* optional */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
