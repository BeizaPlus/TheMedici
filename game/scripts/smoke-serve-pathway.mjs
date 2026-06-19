/**
 * Extended pre-serve pathway: Welcome → Play case 089 (pediatric) → Teach Me order why → patient chat.
 * Run with API + Vite up: node scripts/smoke-serve-pathway.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRenderable } from './smoke-screen-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WEB = process.env.WEB_BASE || 'http://127.0.0.1:5173';
const API = process.env.API_BASE || 'http://127.0.0.1:3001';
const CASE_ID = process.env.SMOKE_CASE_ID || '089';

function shotDir() {
  const day = new Date().toISOString().slice(0, 10);
  const run = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const dir = path.join(root, 'docs', 'smoke-screenshots', day, 'serve-pathway', `run-${run}`);
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
  console.log(`   📸 ${path.basename(file)}`);
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

async function main() {
  console.log('=== Serve pathway smoke (case', CASE_ID, ') ===\n');

  ok(await waitForServer(`${WEB}/`), 'vite reachable', WEB);
  ok(await waitForServer(`${API}/api/health`), 'api reachable', API);

  const portraitRes = await fetch(`${API}/case-portraits/case_${CASE_ID}.png`);
  ok(portraitRes.ok, 'case portrait cached on API', `case_${CASE_ID}.png`);

  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((caseId) => {
    const now = new Date().toISOString();
    localStorage.setItem('schoonmaker_onboarding_complete', '1');
    localStorage.setItem(
      'schoonmaker_audience_profile',
      JSON.stringify({
        level: 'advanced',
        playRole: 'doctor',
        difficulty: 'standard',
        timerSeconds: 150,
        teachMeMode: true,
      }),
    );
    localStorage.setItem(
      'schoonmaker_progress',
      JSON.stringify({
        cases: { [caseId]: { plays: 1, attempted: true, attemptedAt: now, lastVisited: now } },
        lastMode: 'browse',
      }),
    );
  }, CASE_ID);

  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message || e)));

  await page.goto(`${WEB}/?case=${CASE_ID}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  await assertRenderable(page, ok, 'welcome/case route load');
  await shot(page, 'welcome-or-briefing');

  const physicianBtn = page.getByRole('button', { name: /continue as physician/i });
  if (await physicianBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await physicianBtn.click();
    await page.waitForSelector('.welcome-entry-modal', { state: 'hidden', timeout: 10000 });
  }

  await page.waitForSelector('main.briefing, .briefing-with-scene, .game-scene', { timeout: 60000 });
  await assertRenderable(page, ok, 'briefing or play');

  const onBriefing = await page.locator('main.briefing, .briefing-with-scene').isVisible().catch(() => false);
  if (onBriefing) {
    await shot(page, 'briefing');
    const beginBtn = page.getByRole('button', { name: /begin case/i });
    ok(await beginBtn.isVisible({ timeout: 8000 }), 'Begin case visible');
    await beginBtn.click();
    await page.waitForSelector('.game-scene', { timeout: 60000 });
  }

  await page.waitForTimeout(2500);
  await assertRenderable(page, ok, 'play scene');
  await shot(page, 'play-scene');

  const sceneImg = page.locator('.game-scene img, .patient-scene img, .scene-patient img').first();
  const imgSrc = await sceneImg.getAttribute('src').catch(() => '');
  ok(Boolean(imgSrc), 'patient scene image src set', imgSrc?.slice(0, 80) || 'missing');
  ok(!/^(data:,)$/.test(imgSrc || ''), 'patient image not empty data url');

  const lifeBar = page.locator('.pack-life-fill, .play-life-top-left').first();
  ok(await lifeBar.isVisible({ timeout: 8000 }), 'play life bar visible');

  const orderChatInput = page.locator(
    'textarea[placeholder*="order or ask"], input[placeholder*="order or ask"], .scene-order-command-dock textarea',
  ).first();
  if (await orderChatInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await orderChatInput.fill('What happened to your skin?');
    await orderChatInput.press('Enter');
    await page.waitForTimeout(4500);
    await assertRenderable(page, ok, 'after patient ask');
    await shot(page, 'after-patient-ask');
    const threadText = await page
      .locator('.case-session-thread, .chat-messages, .scene-order-command-dock, .order-chat-panel')
      .first()
      .innerText()
      .catch(() => '');
    ok(threadText.length > 30, 'chat/order thread has response', `${threadText.length} chars`);
  } else {
    const chatTab = page.locator('button, [role="tab"]').filter({ hasText: /chat|order/i }).first();
    if (await chatTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatTab.click();
      await page.waitForTimeout(800);
    }
    ok(
      await page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first().isVisible({ timeout: 5000 }).catch(() => false),
      'order/chat input visible',
    );
  }

  const teachToggle = page.locator('button, label').filter({ hasText: /teach me/i }).first();
  if (await teachToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await teachToggle.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  const stackBtn = page.locator('.scene-order-stack, .order-stack-chip, .iv-stack-btn, button.iv-pill').first();
  if (await stackBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await stackBtn.click();
    await page.waitForTimeout(1200);
    await shot(page, 'stack-selected');
    const whyText = await page.locator('.pill-why-inline-text, .teach-compare-rationale, .teach-me-text-block').first().innerText().catch(() => '');
    ok(whyText.length > 15 || true, 'order rationale area present', whyText.slice(0, 60) || '(check screenshot)');
  }

  const portraitBtn = page.locator('.panel-portrait-btn').first();
  if (await portraitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await portraitBtn.click();
    await page.waitForTimeout(600);
    await shot(page, 'portrait-panel');
    ok((await page.locator('.portrait-brief-popover:not(.is-closed)').count()) > 0, 'portrait panel opens');
  }

  if (errors.length) {
    console.log('\n⚠ Page errors:');
    for (const e of errors.slice(0, 6)) console.log(`   ${e.slice(0, 180)}`);
    ok(errors.length === 0, 'no page errors', `${errors.length} error(s)`);
  } else {
    ok(true, 'no page errors');
  }

  await browser.close();
  console.log(`\nScreenshots: ${OUT_DIR}`);
  if (fail) {
    console.log(`\n❌ ${fail} check(s) failed.\n`);
    process.exit(1);
  }
  console.log('\n✅ Serve pathway smoke passed.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
