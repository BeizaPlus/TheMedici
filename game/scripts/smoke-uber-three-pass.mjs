/**
 * Uber wiring — three smoke passes with screenshots (study or main).
 *
 * Pass 1 — Briefing preview plate per Uber case (unique slug wiring)
 * Pass 2 — Begin case → play scene plate + clickable controls
 * Pass 3 — U12 pre-call video + U14 attending voice depth/style persistence
 *
 * Prereq: npm run dev:study  (or dev on :5173–5175)
 * Run:    node scripts/smoke-uber-three-pass.mjs
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
const PROBE = '/assets/patient/uber/subway-afro-dandy-GAME-SCENE.png';

function shotDir() {
  const day = new Date().toISOString().slice(0, 10);
  const run = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const dir = path.join(root, 'docs', 'smoke-screenshots', day, 'uber-three-pass', `run-${run}`);
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

async function resolveWebBase() {
  if (process.env.WEB_BASE) {
    const base = process.env.WEB_BASE.replace(/\/$/, '');
    if (await waitForServer(`${base}/`, 5000)) return base;
  }
  for (const port of [5173, 5174, 5175]) {
    for (const host of ['127.0.0.1', 'localhost']) {
      const base = `http://${host}:${port}`;
      if (!(await waitForServer(`${base}/`, 3000))) continue;
      try {
        const r = await fetch(`${base}${PROBE}`);
        if (r.ok) return base;
      } catch {
        /* next */
      }
    }
  }
  return null;
}

function expectedFragmentForCase(caseId, meta) {
  const slug =
    uberRefs.caseSlugs?.[caseId] ||
    meta?.pediatricFaceSlug ||
    meta?.faceSlug ||
    null;
  if (!slug) return null;
  if (meta?.pediatricFaceSlug) {
    return `/assets/patient/pediatric/${slug}-CHARACTER-MAP.png`;
  }
  const ref = uberRefs.refs?.[slug];
  const file = ref?.gameSceneFile || `${slug}-GAME-SCENE.png`;
  return `/assets/patient/uber/${file}`;
}

async function dismissOnboarding(page) {
  const cta = page.getByRole('button', { name: /Continue as physician/i });
  if (await cta.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cta.click();
    await page.waitForTimeout(400);
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

async function expandSceneTools(page) {
  const timelineToggle = page.locator('.patient-order-timeline-toggle');
  if (await timelineToggle.isVisible({ timeout: 8000 }).catch(() => false)) {
    const expanded = await timelineToggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await timelineToggle.click({ force: true });
      await page.waitForTimeout(400);
    }
  }

  const sceneTools = page.getByRole('button', { name: /Scene tools/i });
  await sceneTools.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const toolbarVisible = await page
    .locator('.dock-toolbar-body .dock-toolbar-nav')
    .isVisible()
    .catch(() => false);
  if (!toolbarVisible && (await sceneTools.isVisible().catch(() => false))) {
    await sceneTools.click({ force: true });
    await page.waitForTimeout(400);
  }
  await page
    .locator('.dock-toolbar-body .dock-toolbar-nav')
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});
}

async function openPlaySettings(page) {
  await expandSceneTools(page);
  const settingsBtn = page.getByRole('button', { name: /^Settings$/i });
  await settingsBtn.waitFor({ state: 'visible', timeout: 15000 });
  await settingsBtn.click({ force: true });
  await page.waitForTimeout(300);
  return page.locator('.toolbar-settings-popover');
}

function readActiveAttendingDepth(page) {
  return page.evaluate(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('schoonmaker_attending_style_prefs') || '{}');
      const slot = prefs.activeSlot || 'a';
      return String(prefs.slots?.[slot]?.depth ?? '');
    } catch {
      return '';
    }
  });
}

async function gotoPlayScene(page, webBase, caseId) {
  await page.goto(`${webBase}/?case=${caseId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissOnboarding(page);
  await page.waitForSelector('main.briefing, .game-scene', { timeout: 60000 });
  if ((await page.locator('.game-scene').count()) > 0) return true;

  const begin = page.getByRole('button', { name: /begin case/i });
  if (await begin.isVisible({ timeout: 8000 }).catch(() => false)) {
    await begin.scrollIntoViewIfNeeded();
    await begin.click({ force: true });
    await page.waitForTimeout(800);
  }

  await page.evaluate(
    ({ id, base }) => {
      localStorage.setItem(
        'schoonmaker_active_play_checkpoint',
        JSON.stringify({
          version: 1,
          caseId: id,
          screen: 'play',
          playMode: 'browse',
          savedAt: new Date().toISOString(),
        }),
      );
      window.location.assign(`${base}/?case=${id}`);
    },
    { id: caseId, base: webBase },
  );
  await page.waitForSelector('.game-scene, .scene-order-command-dock', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return (
    (await page.locator('.game-scene').count()) > 0 ||
    (await page.locator('.scene-order-command-dock').count()) > 0
  );
}

async function pass1BriefingPlates(page, webBase, results) {
  console.log('\n=== Pass 1 — Briefing preview plates ===\n');
  const seenSrc = new Map();

  for (const meta of uberCases.cases) {
    const caseId = meta.id;
    const expected = expectedFragmentForCase(caseId, meta);
    console.log(`--- ${caseId} ---`);

    await page.goto(`${webBase}/?case=${caseId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dismissOnboarding(page);
    await page.waitForSelector('main.briefing, .game-scene', { timeout: 60000 });
    await page.waitForFunction(
      () => {
        const img = document.querySelector('img.briefing-scene-img, img.patient-scene-img');
        return img && img.getAttribute('src') && img.complete;
      },
      { timeout: 15000 },
    ).catch(() => {});
    await page.waitForTimeout(500);

    await assertRenderable(page, ok, `${caseId} briefing renderable`);

    const src = await getPreviewImageSrc(page);
    const wired = Boolean(expected && src && src.includes(expected.split('/').pop().replace('.png', '')));
    ok(Boolean(src), `${caseId} has preview img`, src || 'missing');
    ok(wired || Boolean(meta.pediatricFaceSlug && src?.includes('pediatric')), `${caseId} wired plate`, src || expected);

    if (src) {
      const prior = seenSrc.get(src);
      if (prior && prior !== caseId) {
        const sameSlug =
          uberRefs.caseSlugs?.[caseId] === uberRefs.caseSlugs?.[prior] ||
          meta.faceSlug === uberCases.cases.find((c) => c.id === prior)?.faceSlug;
        ok(sameSlug, `${caseId} shared src intentional (with ${prior})`, src);
      }
      seenSrc.set(src, caseId);
    }

    const shot = path.join(OUT_DIR, `pass1-${caseId}-briefing.png`);
    await page.screenshot({ path: shot, fullPage: false });
    results.push({ pass: 1, caseId, src, expected, shot: path.basename(shot), wired });
  }
}

async function pass2PlayScene(page, webBase, results) {
  console.log('\n=== Pass 2 — Play scene + controls ===\n');
  const sample = ['U01', 'U12', 'U14', 'U15'];

  for (const caseId of sample) {
    console.log(`--- ${caseId} play ---`);
    const playReady = await gotoPlayScene(page, webBase, caseId);
    ok(playReady, `${caseId} play scene loads`);
    if (!playReady) continue;
    await assertRenderable(page, ok, `${caseId} play renderable`);

    const playSrc = await getPreviewImageSrc(page);
    ok(Boolean(playSrc), `${caseId} play scene img`, playSrc || 'missing');

    const popover = await openPlaySettings(page).catch(() => null);
    if (popover && (await popover.isVisible().catch(() => false))) {
      ok(true, `${caseId} Settings popover opens`);
      await page.keyboard.press('Escape');
    }

    const shot = path.join(OUT_DIR, `pass2-${caseId}-play.png`);
    await page.screenshot({ path: shot, fullPage: false });
    results.push({ pass: 2, caseId, playSrc, shot: path.basename(shot) });
  }
}

async function pass3PrecallAndAttending(page, webBase, results) {
  console.log('\n=== Pass 3 — U12 precall + U14 attending voice ===\n');

  // U12 precall
  await page.goto(`${webBase}/?case=U12`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissOnboarding(page);
  await page.waitForSelector('.briefing', { timeout: 60000 });
  await page.waitForTimeout(800);

  const precallDialog = page.locator('.case-precall-intro');
  const hasPrecall = await precallDialog.isVisible({ timeout: 5000 }).catch(() => false);
  ok(hasPrecall, 'U12 precall overlay visible');

  const videoState = await page.evaluate(() => {
    const v = document.querySelector('.case-precall-intro-video');
    if (!v) return { found: false };
    return {
      found: true,
      src: v.getAttribute('src') || v.currentSrc || '',
      readyState: v.readyState,
      paused: v.paused,
      error: v.error?.message || null,
    };
  });
  ok(videoState.found, 'U12 precall video element');
  ok(
    videoState.src?.includes('u12-tom-truck-brake'),
    'U12 video src wired',
    videoState.src || 'empty',
  );
  ok(
    videoState.readyState >= 2 || !videoState.error,
    'U12 video loads (readyState≥2 or no error)',
    `readyState=${videoState.readyState} err=${videoState.error || 'none'}`,
  );

  const skip = page.locator('.case-precall-intro-skip');
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(400);
  }

  const precallShot = path.join(OUT_DIR, 'pass3-U12-precall.png');
  await page.screenshot({ path: precallShot, fullPage: false });
  results.push({ pass: 3, caseId: 'U12', note: 'precall', videoState, shot: path.basename(precallShot) });

  // U14 attending
  const playU14 = await gotoPlayScene(page, webBase, 'U14');
  ok(playU14, 'U14 play for attending settings');
  if (playU14) {
  await openPlaySettings(page);

  const depthSlider = page.locator('.first-opinion-depth-slider');
  ok(await depthSlider.isEnabled(), 'U14 depth slider enabled');
  await depthSlider.fill('3');
  await page.waitForTimeout(200);
  await depthSlider.fill('0');
  await page.waitForTimeout(200);
  const briefDepth = await readActiveAttendingDepth(page);
  ok(briefDepth === '0', 'U14 depth Brief persists', briefDepth);

  await depthSlider.fill('2');
  await page.waitForTimeout(200);
  const deepDepth = await readActiveAttendingDepth(page);
  ok(deepDepth === '2', 'U14 depth Deep persists', deepDepth);

  const style = page.locator('.attending-style-control');
  ok(await style.isVisible(), 'U14 attending style block');
  await style.getByRole('button', { name: 'Physics' }).click({ force: true });
  await page.waitForTimeout(200);
  const physicsOk = await page.evaluate(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('schoonmaker_attending_style_prefs') || '{}');
      const slot = prefs.activeSlot || 'a';
      const leans = prefs.slots?.[slot]?.leans;
      return leans?.physics >= 80;
    } catch {
      return false;
    }
  });
  ok(physicsOk, 'U14 Physics preset active (physics lean ≥80)');

  const attendingShot = path.join(OUT_DIR, 'pass3-U14-attending-settings.png');
  await page.screenshot({ path: attendingShot, fullPage: false });
  results.push({ pass: 3, caseId: 'U14', note: 'attending', briefDepth, deepDepth, shot: path.basename(attendingShot) });
  }
}

async function main() {
  console.log('=== Uber three-pass smoke ===\n');
  console.log(`Output: ${OUT_DIR}\n`);

  const webBase = await resolveWebBase();
  if (!webBase) {
    console.error('❌ No dev server with uber assets on 5173–5175. Run: npm run dev:study');
    process.exit(1);
  }
  ok(true, 'vite + uber assets', webBase);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('schoonmaker_onboarding_complete', '1');
    localStorage.removeItem('schoonmaker_case_regen_images');
    localStorage.removeItem('schoonmaker_patient_image');
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
  const results = [];

  await pass1BriefingPlates(page, webBase, results);
  await pass2PlayScene(page, webBase, results);
  await pass3PrecallAndAttending(page, webBase, results);

  await browser.close();

  const reportPath = path.join(OUT_DIR, 'SMOKE_REPORT.md');
  const lines = [
    '# Uber three-pass smoke',
    '',
    `**Run:** ${new Date().toISOString()}`,
    `**Web:** ${webBase}`,
    '',
    '## Pass 1 — Briefing plates',
    '',
    '| Case | Wired | Screenshot |',
    '|------|-------|------------|',
    ...results
      .filter((r) => r.pass === 1)
      .map((r) => `| ${r.caseId} | ${r.wired ? '✅' : '❌'} | \`${r.shot}\` |`),
    '',
    '## Pass 2 — Play scene',
    '',
    ...results
      .filter((r) => r.pass === 2)
      .map((r) => `- **${r.caseId}** — \`${r.shot}\``),
    '',
    '## Pass 3 — Precall + attending',
    '',
    ...results
      .filter((r) => r.pass === 3)
      .map((r) => `- **${r.caseId}** (${r.note}) — \`${r.shot}\``),
    '',
    fail ? `**Result:** ❌ ${fail} check(s) failed` : '**Result:** ✅ All passes',
    '',
  ];
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);

  if (fail) {
    console.log(`\n❌ ${fail} check(s) failed\n`);
    process.exit(1);
  }
  console.log('\n✅ Uber three-pass smoke passed\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
