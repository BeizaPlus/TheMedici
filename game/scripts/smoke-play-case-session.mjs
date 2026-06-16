/**
 * Welcome → physician → Play (random case) → Briefing → Play scene.
 * Screenshots for agent/human verification before "dev is ready".
 *
 * Run with dev servers up:
 *   npm run dev
 *   node scripts/smoke-play-case-session.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditComponentCss } from './audit-component-css.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WEB = process.env.WEB_BASE || 'http://127.0.0.1:5173';
const API = process.env.API_BASE || 'http://127.0.0.1:3001';
const OUT_DIR = path.join(
  root,
  'docs',
  'smoke-screenshots',
  new Date().toISOString().slice(0, 10),
  'play-case',
);

let fail = 0;

function ok(cond, name, detail = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fail += 1;
  return cond;
}

async function shot(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`   📸 ${file} (${kb} KB)`);
  return file;
}

async function waitForServer(url, ms = 15000) {
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

async function dismissPhysicianOnboarding(page) {
  const physicianBtn = page.getByRole('button', { name: /continue as physician/i });
  if (await physicianBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await physicianBtn.click();
    await page.waitForSelector('.welcome-entry-modal', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(600);
    return true;
  }
  return false;
}

async function openCaseFromWelcome(page) {
  const playNav = page.locator('.welcome-nav-item').filter({ hasText: 'Play' });
  await playNav.click();
  await page.waitForSelector('main.briefing, .briefing-with-scene', { timeout: 45000 });
}

async function main() {
  console.log('=== Play case session smoke + screenshots ===\n');

  const cssIssues = auditComponentCss(root);
  ok(cssIssues.length === 0, 'css-audit', cssIssues[0] || 'ok');

  ok(await waitForServer(`${WEB}/`), 'vite reachable', WEB);
  ok(await waitForServer(`${API}/api/health`), 'api reachable', API);

  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/React does not recognize|Warning:/i.test(text)) return;
    if (/Failed to load resource:.*\b500\b/i.test(text)) return;
    errors.push(text);
  });

  await page.goto(WEB, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(800);
  await shot(page, '01-welcome');

  const showedOnboarding = await dismissPhysicianOnboarding(page);
  if (showedOnboarding) await shot(page, '02-after-physician');

  ok(
    await page.locator('.welcome-nav, .welcome-title').first().isVisible({ timeout: 8000 }),
    'welcome hud visible',
  );
  await shot(page, showedOnboarding ? '03-welcome-ready' : '02-welcome-ready');

  await openCaseFromWelcome(page);

  await page.waitForTimeout(1200);
  await shot(page, showedOnboarding ? '04-briefing' : '03-briefing');

  const caseLabel = await page.locator('.briefing-case').first().textContent().catch(() => '');
  ok(Boolean(caseLabel?.trim()), 'briefing shows case id', caseLabel?.trim() || 'missing');

  const beginBtn = page.getByRole('button', { name: /begin case/i });
  ok(await beginBtn.isVisible({ timeout: 8000 }), 'Begin case button visible');
  await beginBtn.click();

  await page.waitForSelector('.game-scene', { timeout: 25000 });
  await page.waitForTimeout(2000);
  await shot(page, showedOnboarding ? '05-play-scene' : '04-play-scene');

  const lifeBar = page.locator('.pack-life-fill, .play-life-top-left').first();
  ok(await lifeBar.isVisible({ timeout: 8000 }), 'play scene mounted (life bar)');

  const stacks = page.locator('.scene-order-command-dock, .game-sidebar, .icu-monitor-docked').first();
  ok(await stacks.isVisible({ timeout: 10000 }), 'play chrome visible (dock / sidebar / monitor)');

  if (errors.length) {
    console.log('\n⚠ Browser console errors:');
    for (const e of errors.slice(0, 8)) console.log(`   ${e.slice(0, 200)}`);
    ok(errors.length === 0, 'no page errors', `${errors.length} error(s)`);
  } else {
    ok(true, 'no page errors');
  }

  await browser.close();

  console.log(`\nScreenshots folder: ${OUT_DIR}`);
  if (fail) {
    console.log(`\n❌ ${fail} check(s) failed.\n`);
    process.exit(1);
  }
  console.log('\n✅ Play case session smoke passed with screenshots.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
