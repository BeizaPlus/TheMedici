/**
 * Smoke — Attending depth + style settings (play scene toolbar popover).
 *
 * Prereq: dev server up (default main :5174 / API :3002)
 * Run:    npm run smoke:attending-settings
 */
import { chromium } from '@playwright/test';

const WEB = (process.env.WEB_BASE || 'http://127.0.0.1:5174').replace(/\/$/, '');
const CASE_ID = process.env.SMOKE_CASE_ID || '086';

let fail = 0;

function ok(cond, name, detail = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fail += 1;
  return cond;
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

async function readLs(page, key) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

async function openPlaySettings(page) {
  await page.goto(`${WEB}/?case=${CASE_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByRole('button', { name: /begin case/i }).click();
  await page.waitForSelector('.game-scene', { timeout: 90000 });
  await page.waitForTimeout(1000);

  const collapse = page.getByRole('button', { name: /Collapse panel/i });
  if (await collapse.isVisible({ timeout: 5000 }).catch(() => false)) {
    await collapse.click({ force: true });
    await page.waitForTimeout(400);
  }

  const timelineToggle = page.locator('.patient-order-timeline-toggle');
  if (await timelineToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    const expanded = await timelineToggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await timelineToggle.click({ force: true });
      await page.waitForTimeout(400);
    }
  }

  const sceneTools = page.getByRole('button', { name: /Scene tools/i });
  if (await sceneTools.isVisible({ timeout: 5000 }).catch(() => false)) {
    await sceneTools.click({ force: true });
    await page.waitForTimeout(300);
  }

  const settingsBtn = page.getByRole('button', { name: /^Settings$/i });
  ok(await settingsBtn.isVisible({ timeout: 8000 }).catch(() => false), 'Settings button visible');
  await settingsBtn.click({ force: true });
  await page.waitForTimeout(300);
  return page.locator('.toolbar-settings-popover');
}

async function main() {
  console.log('=== Attending settings smoke ===\n');
  console.log(`Web: ${WEB} · case ${CASE_ID}\n`);

  ok(await waitForServer(`${WEB}/`), 'vite reachable', WEB);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('schoonmaker_onboarding_complete', '1');
    localStorage.setItem('schoonmaker_timeline_collapsed', '0');
    localStorage.removeItem('schoonmaker_first_opinion_depth');
    localStorage.removeItem('schoonmaker_attending_style_prefs');
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

  const popover = await openPlaySettings(page);
  ok(await popover.isVisible(), 'Settings popover open');

  const depthSlider = page.locator('#first-opinion-depth-scene');
  ok(await depthSlider.isEnabled(), 'Depth slider enabled');
  await depthSlider.fill('3');
  await page.waitForTimeout(150);
  await depthSlider.fill('0');
  await page.waitForTimeout(250);
  ok((await readLs(page, 'schoonmaker_first_opinion_depth')) === '0', 'Depth → Brief');
  await depthSlider.fill('2');
  await page.waitForTimeout(200);
  ok((await readLs(page, 'schoonmaker_first_opinion_depth')) === '2', 'Depth → Deep');

  const style = popover.locator('.attending-style-control');
  ok(await style.isVisible(), 'Attending style block visible');

  const slotB = style.getByRole('tab', { name: /Attending B/i });
  await slotB.click({ force: true });
  await page.waitForTimeout(200);
  let prefs = JSON.parse((await readLs(page, 'schoonmaker_attending_style_prefs')) || '{}');
  ok(prefs.activeSlot === 'b', 'Attending B selects', prefs.activeSlot);

  for (const label of ['Balanced', 'Physics', 'Biochemistry', 'Abstraction', 'Meaning']) {
    const btn = style.getByRole('button', { name: label });
    ok(await btn.isEnabled().catch(() => false), `Preset "${label}" enabled`);
    await btn.click({ force: true });
    await page.waitForTimeout(120);
    ok((await btn.getAttribute('aria-pressed')) === 'true', `Preset "${label}" active`);
  }

  const physicsSlider = page.locator('#attending-lean-physics');
  await physicsSlider.fill('65');
  await page.waitForTimeout(200);
  prefs = JSON.parse((await readLs(page, 'schoonmaker_attending_style_prefs')) || '{}');
  ok(prefs?.slots?.b?.leans?.physics === 65, 'Physics slider persists', String(prefs?.slots?.b?.leans?.physics));

  const blockReport = await page.evaluate(() => {
    const pop = document.querySelector('.toolbar-settings-popover');
    if (!pop) return { error: 'no popover' };
    const targets = [
      ...pop.querySelectorAll('details[open] button, details[open] input[type="range"]'),
    ];
    const blocked = targets.filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const top = document.elementFromPoint(cx, cy);
      const pe = window.getComputedStyle(el).pointerEvents;
      return pe === 'none' || el.disabled || (top && top !== el && !el.contains(top));
    });
    return { total: targets.length, blocked: blocked.length };
  });
  ok(blockReport.total >= 10, 'Controls in popover', String(blockReport.total));
  ok(blockReport.blocked <= 2, 'Open-section controls clickable', `${blockReport.blocked} blocked of ${blockReport.total}`);

  await browser.close();

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — ${fail} check(s) failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
