/** Capture body-only plate from ECG Vector Lab for Magnific reference. */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'ecg-vector-lab', 'character', 'boy-body-plate-ref.png');
const url = process.env.WEB_BASE || 'http://127.0.0.1:5173/ecg-vector-lab.html';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 780 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  if (typeof S !== 'undefined') {
    S.showHeart = false;
    S.showScope = false;
    S.showTri = false;
    S.showVector = false;
    S.showComet = false;
  }
  document.querySelectorAll('.layer-pill').forEach((btn) => btn.classList.remove('on'));
});
await page.waitForTimeout(800);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.locator('#bodyScopeWrap').screenshot({ path: out });
await browser.close();
console.log('Saved', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
