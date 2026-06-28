/**
 * Case 086 — ADPKD / hypertensive vitals + case story API + storyboard smoke.
 *
 * Prereq: npm run dev:alt  (API :3002 · Vite :5174)
 * Run:    node scripts/smoke-case-086.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRenderable } from './smoke-screen-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WEB = (process.env.WEB_BASE || 'http://127.0.0.1:5174').replace(/\/$/, '');
const API = (process.env.API_BASE || 'http://127.0.0.1:3002').replace(/\/$/, '');
const CASE_ID = '086';
const CHARACTER_MAP = '/assets/patient/uber/adpkd-long-nose-elder-CHARACTER-MAP.png';
const CACHE_DIR = path.join(root, '.case-story-cache');

function shotDir() {
  const day = new Date().toISOString().slice(0, 10);
  const run = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const dir = path.join(root, 'docs', 'smoke-screenshots', day, 'case-086', `run-${run}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

let OUT_DIR = shotDir();
let shotSeq = 0;
let fail = 0;
const log = [];

function ok(cond, name, detail = '') {
  const mark = cond ? '✅' : '❌';
  const line = `${mark} ${name}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  log.push(line);
  if (!cond) fail += 1;
  return cond;
}

async function shot(page, name, locator = null) {
  const file = path.join(OUT_DIR, `${String(++shotSeq).padStart(2, '0')}-${name}.png`);
  if (locator) {
    await locator.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`   📸 ${path.basename(file)} (${kb} KB)`);
  return file;
}

async function waitForServer(url, ms = 45000) {
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
  const cta = page.getByRole('button', { name: /Continue as physician/i });
  if (await cta.isVisible({ timeout: 4000 }).catch(() => false)) {
    await cta.click();
    await page.waitForTimeout(600);
  }
}

async function getSceneImageSrc(page) {
  return page.evaluate(() => {
    const img =
      document.querySelector('.case-detail-scene-img img') ||
      document.querySelector('.briefing-with-scene img') ||
      document.querySelector('.game-scene img') ||
      document.querySelector('img[src*="patient"]');
    return img?.getAttribute('src') || '';
  });
}

async function waitForImgLoaded(locator, ms = 120000) {
  try {
    await locator.waitFor({ state: 'visible', timeout: ms });
    await locator.evaluate(
      (img) =>
        new Promise((resolve, reject) => {
          if (img.complete && img.naturalWidth > 0) return resolve(true);
          const t = setTimeout(() => reject(new Error('img timeout')), ms);
          img.onload = () => {
            clearTimeout(t);
            resolve(true);
          };
          img.onerror = () => {
            clearTimeout(t);
            reject(new Error('img error'));
          };
        }),
      { timeout: ms },
    );
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== Case 086 smoke — briefing → play → case story → storyboard ===\n');
  console.log(`Web: ${WEB} · API: ${API}`);
  console.log(`Output: ${OUT_DIR}\n`);

  ok(await waitForServer(`${WEB}/`), 'vite reachable', WEB);
  ok(await waitForServer(`${API}/api/health`), 'api reachable', API);

  let magnific = false;
  try {
    const h = await fetch(`${API}/api/health`).then((r) => r.json());
    magnific = Boolean(h?.magnific);
    ok(magnific, 'magnific API key configured', magnific ? 'image gen enabled' : 'oversight/panels may skip');
  } catch {
    ok(false, 'api health parse');
  }

  const mapProbe = await fetch(`${WEB}${CHARACTER_MAP}`).catch(() => null);
  ok(mapProbe?.ok, 'character map served', CHARACTER_MAP);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('schoonmaker_onboarding_complete', '1');
    localStorage.setItem('schoonmaker_timeline_collapsed', '0');
    localStorage.setItem(
      'schoonmaker_audience_profile',
      JSON.stringify({
        level: 'advanced',
        playRole: 'doctor',
        difficulty: 'standard',
        timerSeconds: 150,
      }),
    );
  });
  const page = await context.newPage();

  const apiCalls = [];
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('/api/case-story')) {
      apiCalls.push({ url: u, status: res.status() });
    }
  });

  await page.goto(`${WEB}/?case=${CASE_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissOnboarding(page);
  await page.waitForSelector('.game-scene, main.briefing, .briefing-with-scene', { timeout: 90000 });
  await page.waitForTimeout(2000);
  await assertRenderable(page, ok, 'case 086 route');

  const briefingSrc = await getSceneImageSrc(page);
  ok(
    briefingSrc.includes('adpkd-long-nose-elder') ||
      briefingSrc.includes('case_086') ||
      briefingSrc.includes('patient'),
    'briefing patient plate',
    briefingSrc.slice(0, 80) || 'no img',
  );
  await shot(page, 'briefing');

  const beginBtn = page.getByRole('button', { name: /begin case/i });
  ok(await beginBtn.isVisible({ timeout: 10000 }).catch(() => false), 'Begin case visible');
  if (await beginBtn.isVisible().catch(() => false)) {
    await beginBtn.click();
    await page.waitForSelector('.game-scene', { timeout: 90000 });
    await page.waitForTimeout(2500);
    await assertRenderable(page, ok, 'play scene');

    const vitalsText = await page
      .locator('.vitals-monitor, .patient-vitals, [class*="vital"]')
      .first()
      .textContent()
      .catch(() => '');
    const hypertensive =
      /1[4-9]\d\/[89]\d/.test(vitalsText || '') ||
      (await page.content()).includes('162') ||
      (await page.content()).includes('158');
    ok(hypertensive, 'monitor shows hypertensive BP', vitalsText?.replace(/\s+/g, ' ').trim().slice(0, 60) || 'check vitals strip');
    await shot(page, 'play-scene-vitals');

    const orderInput = page.locator('.order-command-input, input[placeholder*="order" i]').first();
    if (await orderInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await orderInput.fill('renal us');
      await page.waitForTimeout(800);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      await shot(page, 'order-renal-us');
    }

    const dockHandle = page.locator('.game-sidebar.floating .dock-handle').first();
    if (await dockHandle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const collapsed = await page.locator('.game-sidebar.floating.collapsed').count();
      if (collapsed > 0) await dockHandle.click();
      await page.waitForTimeout(600);
    }

    const timelineToggle = page.locator('.patient-order-timeline-toggle');
    if (await timelineToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      const expanded = await timelineToggle.getAttribute('aria-expanded');
      if (expanded !== 'true') await timelineToggle.click();
      await page.waitForTimeout(500);
    }

    const sceneTools = page.getByRole('button', { name: /scene tools/i });
    if (await sceneTools.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sceneTools.click();
      await page.waitForTimeout(500);
    }

    await page.getByRole('button', { name: 'Settings', exact: true }).click({ timeout: 15000 });
    await page.waitForSelector('.toolbar-settings-popover', { timeout: 8000 });
    const storyBtn = page.getByRole('button', { name: 'Case story', exact: true });
    ok(await storyBtn.isVisible({ timeout: 5000 }).catch(() => false), 'Case story button visible');
    await storyBtn.evaluate((el) => el.click());
    await page.waitForSelector('.case-story-overlay', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const compiling = await page.locator('.case-story-loading-img').count();
    if (compiling) {
      await page.waitForSelector('.case-story-loading-img', { state: 'hidden', timeout: 120000 }).catch(() => {});
    }
    await page.waitForTimeout(1500);

    const storyTitle = await page.locator('.case-story-title').textContent().catch(() => '');
    ok(Boolean(storyTitle?.trim()), 'story compiled title', storyTitle?.slice(0, 60) || '');
    await shot(page, 'case-story-prose', page.locator('.case-story-overlay'));

    const genMaster = page.getByRole('button', { name: /generate oversight still/i });
    if (magnific && (await genMaster.isVisible({ timeout: 5000 }).catch(() => false))) {
      await genMaster.click();
      await page.waitForTimeout(1000);
      await shot(page, 'case-story-master-rendering', page.locator('.case-story-overlay'));
      const masterImg = page.locator('.case-story-master img');
      const loaded = await waitForImgLoaded(masterImg, 180000);
      const src = (await masterImg.getAttribute('src').catch(() => '')) || '';
      ok(loaded && src.length > 10, 'oversight still rendered', src.slice(0, 80));
      await shot(page, 'case-story-master-done', page.locator('.case-story-overlay'));
    } else {
      ok(!magnific, 'oversight still skipped (no magnific)', 'click Generate oversight still when key set');
    }

    await page.getByRole('tab', { name: /storyboard/i }).click();
    await page.waitForTimeout(1500);
    await shot(page, 'storyboard-captions', page.locator('.case-story-overlay'));

    const genPanels = page.getByRole('button', { name: /generate panel stills/i });
    if (magnific && (await genPanels.isVisible({ timeout: 5000 }).catch(() => false))) {
      await genPanels.click();
      await page.waitForTimeout(2000);
      await page
        .waitForFunction(
          () => {
            const busy = document.querySelector('.case-story-gen-progress');
            return !busy;
          },
          { timeout: 300000 },
        )
        .catch(() => {});
      await page.waitForTimeout(2000);
      const panelImgs = await page.locator('.case-story-storyboard-figure img').count();
      ok(panelImgs > 0, 'storyboard panel images', `${panelImgs} panels`);
      await shot(page, 'storyboard-panels-done', page.locator('.case-story-overlay'));
    }

    ok(apiCalls.some((c) => c.url.includes('/api/case-story')), 'case-story API called', `${apiCalls.length} hit(s)`);
  }

  await browser.close();

  const cacheJson = path.join(CACHE_DIR, `case_${CASE_ID}.json`);
  const cachePngs = fs.existsSync(CACHE_DIR)
    ? fs.readdirSync(CACHE_DIR).filter((f) => f.startsWith(`case_${CASE_ID}`) && f.endsWith('.png'))
    : [];
  ok(fs.existsSync(cacheJson) || cachePngs.length > 0, 'case story cache artifacts', cachePngs.join(', ') || cacheJson);

  const reportPath = path.join(OUT_DIR, 'SMOKE_REPORT.md');
  fs.writeFileSync(
    reportPath,
    [
      '# Case 086 smoke — start to storyboard',
      '',
      `**Run:** ${new Date().toISOString()}`,
      `**Web:** ${WEB} · **API:** ${API}`,
      `**Character:** adpkd-long-nose-elder`,
      `**Cache:** ${CACHE_DIR}`,
      '',
      fail ? `**Result:** ❌ ${fail} check(s) failed` : '**Result:** ✅ Passed',
      '',
      '## Checks',
      ...log.map((l) => `- ${l}`),
      '',
      '## API calls',
      ...(apiCalls.length ? apiCalls.map((c) => `- ${c.status} ${c.url}`) : ['- (none captured)']),
      '',
      '## Cache files',
      ...(cachePngs.length ? cachePngs.map((f) => `- \`${f}\``) : [`- json: ${fs.existsSync(cacheJson)}`]),
      '',
    ].join('\n'),
  );

  console.log(`\nReport: ${reportPath}`);
  console.log(`Cache:  ${CACHE_DIR}`);

  const { spawn } = await import('node:child_process');
  spawn('explorer.exe', [OUT_DIR], { detached: true, stdio: 'ignore' }).unref();
  if (fs.existsSync(CACHE_DIR)) {
    spawn('explorer.exe', [CACHE_DIR], { detached: true, stdio: 'ignore' }).unref();
  }

  if (fail) {
    console.log(`\n❌ ${fail} check(s) failed\n`);
    process.exit(1);
  }
  console.log('\n✅ Case 086 smoke passed — screenshot + cache folders opened.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
