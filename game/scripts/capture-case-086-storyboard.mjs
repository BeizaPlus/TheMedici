import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'docs/smoke-screenshots/2026-06-19/case-086/run-153306';
const WEB = 'http://127.0.0.1:5174';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  localStorage.setItem('schoonmaker_onboarding_complete', '1');
  localStorage.setItem('schoonmaker_timeline_collapsed', '0');
  localStorage.removeItem('schoonmaker_play_checkpoint');
});
const page = await ctx.newPage();
await page.goto(`${WEB}/?case=086`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /begin case/i }).click();
await page.waitForSelector('.game-scene');
await page.waitForTimeout(1500);
const timelineToggle = page.locator('.patient-order-timeline-toggle');
if ((await timelineToggle.getAttribute('aria-expanded')) !== 'true') await timelineToggle.click();
await page.getByRole('button', { name: /scene tools/i }).click().catch(() => {});
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByRole('button', { name: 'Case story', exact: true }).evaluate((el) => el.click());
await page.waitForSelector('.case-story-overlay');
await page.waitForTimeout(2000);
await page.getByRole('tab', { name: /storyboard/i }).click();
await page.waitForTimeout(3000);
const outFile = path.join(OUT, '08-storyboard-grid.png');
await page.locator('.case-story-overlay').screenshot({ path: outFile });
console.log('saved', outFile);
await browser.close();
