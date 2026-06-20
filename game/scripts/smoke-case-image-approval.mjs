/** Screenshot case-image-approval page (case 153 card). */
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${WEB}/case-image-approval/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll('.card').length > 0, null, { timeout: 60000 });
await page.locator('[data-id="153"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator('[data-id="153"]').screenshot({ path: path.join(OUT, '05-approval-card-case-153.png') });
await page.screenshot({ path: path.join(OUT, '06-approval-page-scroll.png'), fullPage: true });
await browser.close();
console.log('Wrote', OUT);
