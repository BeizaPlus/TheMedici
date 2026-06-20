/** Case 153 — case story storyboard only (after Magnific beats). */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = (process.env.WEB_BASE || 'http://127.0.0.1:5174').replace(/\/$/, '');
const day = new Date().toISOString().slice(0, 10);
const OUT = path.join(root, 'docs', 'smoke-screenshots', day, 'case-153-fixed');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => {
  localStorage.setItem('schoonmaker_onboarding_complete', '1');
  document.documentElement.requestFullscreen = () => Promise.reject(new Error('smoke'));
});
const page = await context.newPage();
await page.goto(`${WEB}/?case=153`, { waitUntil: 'domcontentloaded', timeout: 90000 });
const begin = page.getByRole('button', { name: /begin case/i });
if (await begin.isVisible({ timeout: 8000 }).catch(() => false)) {
  await begin.click();
  await page.waitForSelector('.game-scene', { timeout: 90000 });
  await page.waitForTimeout(1500);
}
const sceneTools = page.getByRole('button', { name: /scene tools/i });
if (await sceneTools.isVisible({ timeout: 5000 }).catch(() => false)) {
  await sceneTools.click();
  await page.waitForTimeout(400);
}
await page.getByRole('button', { name: 'Settings', exact: true }).click({ timeout: 15000 });
await page.waitForSelector('.toolbar-settings-popover', { timeout: 8000 });
await page.getByLabel('Toolbar settings').getByRole('button', { name: 'Case story', exact: true }).evaluate((el) => el.click());
await page.waitForSelector('.case-story-overlay', { timeout: 30000 });
await page.waitForTimeout(2000);
await page.locator('.case-story-overlay').screenshot({ path: path.join(OUT, '03-case-story-prose-fixed.png') });
await page.getByRole('tab', { name: /storyboard/i }).click();
await page.waitForTimeout(3000);
const panels = await page.locator('.case-story-storyboard-panel img').count();
console.log('Storyboard img tags:', panels);
await page.locator('.case-story-overlay').screenshot({ path: path.join(OUT, '04-case-story-storyboard-fixed.png') });
await browser.close();
fs.writeFileSync(
  path.join(OUT, 'README.md'),
  `# Case 153 fixed proof\n\n- Storyboard images visible: ${panels}\n- Portrait regen: uber ngavu-yellow-party\n- Grid stitched from 6 Magnific beats\n`,
);
console.log('Wrote', OUT);
