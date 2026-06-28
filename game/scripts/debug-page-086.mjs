import { chromium } from '@playwright/test';
import fs from 'node:fs';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  localStorage.setItem('schoonmaker_onboarding_complete', '1');
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto('http://127.0.0.1:5174/?case=086', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(5000);
const html = await page.content();
console.log('title:', await page.title());
console.log('body len:', html.length);
console.log('briefing:', html.includes('briefing'));
console.log('game-scene:', html.includes('game-scene'));
console.log('welcome:', html.includes('welcome'));
const root = await page.locator('#root').innerHTML().catch(() => 'empty');
console.log('root:', root.slice(0, 800));
console.log('errors:', errors.slice(0, 8));
fs.mkdirSync('docs/smoke-screenshots', { recursive: true });
await page.screenshot({ path: 'docs/smoke-screenshots/debug-086.png', fullPage: true });
await browser.close();
