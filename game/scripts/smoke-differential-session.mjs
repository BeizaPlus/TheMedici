/**
 * Differential practice session smoke + screenshots.
 * Run with dev servers up: npm run dev
 *   node scripts/smoke-differential-session.mjs
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
const OUT_DIR = path.join(root, 'docs', 'smoke-screenshots', new Date().toISOString().slice(0, 10));

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

async function bgColor(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const bg = getComputedStyle(el).backgroundColor;
    return bg;
  }, selector);
}

async function isMostlyWhite(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');
    const body = document.body;
    const bg = getComputedStyle(root || body).backgroundColor;
    const text = (root?.innerText || body.innerText || '').trim();
    const hasFeature =
      document.querySelector('.diff-practice') ||
      document.querySelector('.welcome-screen') ||
      document.querySelector('.briefing');
    if (hasFeature) return false;
    const whiteish = bg === 'rgb(255, 255, 255)' || bg === 'rgba(0, 0, 0, 0)';
    const tiny = text.length < 40;
    return whiteish && tiny;
  });
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

async function main() {
  console.log('=== Differential session smoke + screenshots ===\n');

  const cssIssues = auditComponentCss(root);
  ok(cssIssues.length === 0, 'css-audit', cssIssues[0] || 'ok');

  ok(await waitForServer(`${WEB}/`), 'vite reachable', WEB);
  ok(await waitForServer(`${API}/api/health`), 'api reachable', API);

  const voice = await fetch(`${API}/api/voice-note/status`).then((r) => r.json()).catch(() => null);
  ok(voice?.batch === true, 'voice-note batch STT', `mode=${voice?.mode}`);

  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/React does not recognize|Warning:/i.test(text)) return;
    errors.push(text);
  });

  await page.goto(WEB, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(800);
  await shot(page, '01-welcome');

  const physicianBtn = page.getByRole('button', { name: /continue as physician/i });
  if (await physicianBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await physicianBtn.click();
    await page.waitForTimeout(800);
    await shot(page, '02-after-physician');
  }

  const diffNav = page.locator('.welcome-nav-item').filter({ hasText: 'Differentials' });
  ok(await diffNav.isVisible({ timeout: 8000 }), 'Differentials nav visible');
  await diffNav.click();

  await page.waitForSelector('.diff-practice', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await shot(page, '03-differential-main');

  const diffBg = await bgColor(page, '.diff-practice');
  ok(
    diffBg && diffBg !== 'rgba(0, 0, 0, 0)' && diffBg !== 'rgb(255, 255, 255)',
    'diff-practice has dark background',
    diffBg || 'missing',
  );
  ok(!(await isMostlyWhite(page)), 'not white blank screen');

  const caseTab = page.getByRole('tab', { name: /^Case$/ });
  if (await caseTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await caseTab.click();
    await page.waitForTimeout(600);
    await shot(page, '04-study-case-tab');
  }

  const realTab = page.getByRole('tab', { name: /Real World/ });
  if (await realTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await realTab.click();
    await page.waitForTimeout(800);
    await shot(page, '05-study-realworld-tab');
  }

  const chatDock = page.locator('.diff-dock-chat-btn, button[aria-label*="Chat"], button[title*="Chat"]').first();
  if (await chatDock.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chatDock.click();
    await page.waitForTimeout(600);
    await shot(page, '06-floating-chat-open');
  }

  const recordBtn = page.locator('.case-record-btn, [aria-label*="Record"], [aria-label*="microphone"]').first();
  ok(await recordBtn.isVisible({ timeout: 5000 }), 'record button visible');

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
  console.log('\n✅ Session smoke passed with screenshots.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
