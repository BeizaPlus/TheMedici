/**
 * Case 176 — subway-afro-dandy + collapsed dock chrome smoke + screenshots.
 *
 *   npm run dev:alt
 *   npm run smoke:case-176
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
const EXPECTED_PLATE = '/assets/patient/uber/subway-afro-dandy-GAME-SCENE.png';
const CASE_ID = '176';

function shotDir() {
  const day = new Date().toISOString().slice(0, 10);
  const run = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const dir = path.join(root, 'docs', 'smoke-screenshots', day, 'case-176', `run-${run}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

let OUT_DIR = shotDir();
let shotSeq = 0;
let fail = 0;

function ok(cond, name, detail = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fail += 1;
  return cond;
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${String(++shotSeq).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`   📸 ${path.basename(file)} (${kb} KB)`);
  return file;
}

async function waitForServer(url, ms = 30000) {
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
      document.querySelector('.patient-scene img') ||
      document.querySelector('img[src*="patient"]');
    return img?.getAttribute('src') || '';
  });
}

async function main() {
  console.log('=== Case 176 smoke + screenshots ===\n');
  console.log(`Web: ${WEB} · API: ${API}`);
  console.log(`Output: ${OUT_DIR}\n`);

  ok(await waitForServer(`${WEB}/`), 'vite reachable', WEB);
  ok(await waitForServer(`${API}/api/health`), 'api reachable', API);

  const plateProbe = await fetch(`${WEB}${EXPECTED_PLATE}`).catch(() => null);
  ok(plateProbe?.ok, 'subway-afro-dandy GAME-SCENE served', EXPECTED_PLATE);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('schoonmaker_onboarding_complete', '1');
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

  await page.goto(`${WEB}/?case=${CASE_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissOnboarding(page);
  await page.waitForSelector('.game-scene, main.briefing, .briefing-with-scene', { timeout: 60000 });
  await page.waitForTimeout(2000);
  await assertRenderable(page, ok, 'case 176 route');

  const briefingSrc = await getSceneImageSrc(page);
  const wiredBriefing = briefingSrc.includes('subway-afro-dandy');
  ok(wiredBriefing, 'briefing patient plate', briefingSrc || 'no img');
  await shot(page, 'briefing');

  const beginBtn = page.getByRole('button', { name: /begin case/i });
  if (await beginBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await beginBtn.click();
    await page.waitForSelector('.game-scene', { timeout: 60000 });
    await page.waitForTimeout(2500);
    await assertRenderable(page, ok, 'play scene');
    const playSrc = await getSceneImageSrc(page);
    ok(playSrc.includes('subway-afro-dandy-GAME-PLAY-SCENE'), 'play scene angled plate', playSrc || 'no img');
    await shot(page, 'play-scene');

    const dockHandle = page.locator('.game-sidebar.floating .dock-handle').first();
    if (await dockHandle.isVisible({ timeout: 8000 }).catch(() => false)) {
      await dockHandle.click();
      await page.waitForTimeout(600);
      const collapsed = await page.locator('.game-sidebar.floating.collapsed').count();
      ok(collapsed > 0, 'dock collapsed on handle click');
      const locHidden = await page.evaluate(() => {
        const el = document.querySelector('.game-sidebar.floating.collapsed .case-location-context');
        if (!el) return true;
        return getComputedStyle(el).display === 'none';
      });
      ok(locHidden, 'collapsed hides location subtitle');
      await shot(page, 'dock-collapsed');
    } else {
      ok(false, 'dock handle visible');
    }

    const storyBtn = page.getByRole('button', { name: /case story/i });
    if (await storyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await storyBtn.click();
      await page.waitForTimeout(1200);
      await shot(page, 'case-story-panel');
      const storyTitle = await page.locator('.case-story-panel, [class*="case-story"]').first().textContent().catch(() => '');
      ok(Boolean(storyTitle?.trim()), 'case story panel opens', storyTitle?.slice(0, 60) || '');
    }
  } else {
    ok(false, 'Begin case visible on briefing');
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, 'SMOKE_REPORT.md');
  fs.writeFileSync(
    reportPath,
    [
      '# Case 176 smoke',
      '',
      `**Run:** ${new Date().toISOString()}`,
      `**Web:** ${WEB}`,
      `**Character:** subway-afro-dandy`,
      '',
      fail ? `**Result:** ❌ ${fail} check(s) failed` : '**Result:** ✅ Passed',
      '',
      'After visual approval: `powershell -File C:\\Users\\steve\\MeWorld\\scripts\\create-study-snapshot.ps1`',
      '',
    ].join('\n'),
  );

  console.log(`\nReport: ${reportPath}`);
  try {
    const { spawn } = await import('node:child_process');
    spawn('explorer.exe', [OUT_DIR], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* optional */
  }

  if (fail) {
    console.log(`\n❌ ${fail} check(s) failed\n`);
    process.exit(1);
  }
  console.log('\n✅ Case 176 smoke passed — review screenshots, then study snapshot when ready.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
