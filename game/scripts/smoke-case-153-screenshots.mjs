/**
 * Case 153 — Medical sequence consequence beats + case story storyboard screenshots.
 * Prereq: npm run dev:alt (API :3002 · Vite :5174)
 * Run: node scripts/smoke-case-153-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WEB = (process.env.WEB_BASE || 'http://127.0.0.1:5174').replace(/\/$/, '');
const CASE_ID = '153';

function shotDir() {
  const day = new Date().toISOString().slice(0, 10);
  const run = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  return path.join(root, 'docs', 'smoke-screenshots', day, 'case-153-consequences', `run-${run}`);
}

async function dismissOnboarding(page) {
  const cta = page.getByRole('button', { name: /Continue as physician/i });
  if (await cta.isVisible({ timeout: 4000 }).catch(() => false)) {
    await cta.click();
    await page.waitForTimeout(600);
  }
}

async function expandTimeline(page) {
  const toggle = page.locator('.patient-order-timeline-toggle');
  if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    await page.waitForTimeout(500);
  }
}

async function main() {
  const OUT_DIR = shotDir();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Output: ${OUT_DIR}\n`);

  const cacheFile = path.join(root, '.medical-sequence-cache', `case_${CASE_ID}.json`);
  if (fs.existsSync(cacheFile)) {
    fs.unlinkSync(cacheFile);
    console.log('Cleared stale medical-sequence cache for 153');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('schoonmaker_onboarding_complete', '1');
    localStorage.setItem('schoonmaker_timeline_collapsed', '0');
    localStorage.setItem(
      'schoonmaker_audience_profile',
      JSON.stringify({ level: 'advanced', playRole: 'doctor', difficulty: 'standard', timerSeconds: 150 }),
    );
    document.documentElement.requestFullscreen = () => Promise.reject(new Error('smoke: no fullscreen'));
  });
  const page = await context.newPage();

  await page.goto(`${WEB}/?case=${CASE_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissOnboarding(page);
  await page.waitForSelector('.game-scene, main.briefing, .briefing-with-scene', { timeout: 90000 });

  const begin = page.getByRole('button', { name: /begin case/i });
  if (await begin.isVisible({ timeout: 8000 }).catch(() => false)) {
    await begin.click();
    await page.waitForSelector('.game-scene', { timeout: 90000 });
    await page.waitForTimeout(2000);
  }

  await expandTimeline(page);
  await page.locator('.sidebar-foot-buttons button').filter({ hasText: /Teach Me/ }).first().click();
  await page.waitForSelector('.teach-compare-scene-dock', { timeout: 15000 });
  await page.waitForTimeout(600);

  // Sidebar HPI can overlap dock buttons — programmatic click avoids pointer intercept.
  await page.getByRole('button', { name: 'Sequence', exact: true }).evaluate((el) => el.click());
  await page.waitForSelector('.med-seq-overlay', { timeout: 30000 });
  await page.waitForSelector('.med-seq-beat-caption', { timeout: 30000 });

  const refresh = page.locator('.med-seq-head-actions .med-seq-btn').first();
  if (await refresh.isVisible().catch(() => false)) {
    await refresh.click();
    await page.waitForSelector('.med-seq-beat-caption', { timeout: 45000 });
  }
  await page.waitForTimeout(1000);

  const missedCaption = await page.locator('.med-seq-beat-caption').first().textContent();
  const hasConsequence = /porphyrin|blister|silent infection|iron overload|accumulat/i.test(missedCaption || '');
  console.log('Missed caption:', missedCaption?.slice(0, 100));
  if (!hasConsequence) console.warn('⚠ Expected patient-consequence copy — got:', missedCaption);

  await page.locator('.med-seq-panel').screenshot({
    path: path.join(OUT_DIR, '01-med-seq-orders-missed.png'),
  });
  console.log('📸 01-med-seq-orders-missed.png');

  await page.getByRole('tab', { name: /if stabilized in time/i }).click();
  await page.waitForTimeout(800);
  const savedCaption = await page.locator('.med-seq-beat-caption').first().textContent();
  console.log('Saved caption:', savedCaption?.slice(0, 100));

  await page.locator('.med-seq-panel').screenshot({
    path: path.join(OUT_DIR, '02-med-seq-stabilized.png'),
  });
  console.log('📸 02-med-seq-stabilized.png');

  await page.locator('.med-seq-btn-close').click();
  await page.waitForTimeout(500);

  const sceneTools = page.getByRole('button', { name: /scene tools/i });
  if (await sceneTools.isVisible({ timeout: 5000 }).catch(() => false)) {
    await sceneTools.click();
    await page.waitForTimeout(400);
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click({ timeout: 10000 });
  await page.waitForSelector('.toolbar-settings-popover', { timeout: 8000 });
  await page.getByLabel('Toolbar settings').getByRole('button', { name: 'Case story', exact: true }).evaluate((el) => el.click());
  await page.waitForSelector('.case-story-overlay', { timeout: 30000 });
  await page.waitForTimeout(2500);

  await page.locator('.case-story-overlay').screenshot({
    path: path.join(OUT_DIR, '03-case-story-prose.png'),
  });
  console.log('📸 03-case-story-prose.png');

  await page.getByRole('tab', { name: /storyboard/i }).click();
  await page.waitForTimeout(1200);

  const beatCount = await page.locator('.case-story-storyboard-panel').count();
  console.log(`Storyboard panels: ${beatCount}`);

  await page.locator('.case-story-overlay').screenshot({
    path: path.join(OUT_DIR, '04-case-story-storyboard-6-beats.png'),
  });
  console.log('📸 04-case-story-storyboard-6-beats.png');

  const cameraText = await page.locator('.case-story-storyboard-lock').textContent().catch(() => '');
  console.log('Camera hint:', cameraText?.replace(/\s+/g, ' ').trim());

  await browser.close();

  const report = [
    '# Case 153 consequence screenshots',
    '',
    `**Run:** ${new Date().toISOString()}`,
    `**Web:** ${WEB}`,
    '',
    `- Missed caption check: ${hasConsequence ? '✅' : '⚠️'} ${missedCaption?.slice(0, 120)}`,
    `- Saved caption: ${savedCaption?.slice(0, 120)}`,
    `- Storyboard panels: ${beatCount}`,
    '',
    '## Files',
    '- `01-med-seq-orders-missed.png`',
    '- `02-med-seq-stabilized.png`',
    '- `03-case-story-prose.png`',
    '- `04-case-story-storyboard-6-beats.png`',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), report);

  const { spawn } = await import('node:child_process');
  spawn('explorer.exe', [OUT_DIR], { detached: true, stdio: 'ignore' }).unref();
  console.log(`\nDone — folder opened: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
