import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5173/?case=126';
const out = process.argv[3] || 'case126-play-screenshot.png';
const clickBegin = process.argv[4] === 'play';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
if (clickBegin) {
  await page.getByRole('button', { name: /Begin case/i }).click();
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: out, fullPage: false });
const img = page.locator('.patient-scene-img, .briefing-scene-img').first();
const imgSrc = await img.getAttribute('src').catch(() => null);
const imgOk = await img
  .evaluate((el) => el?.complete && el.naturalWidth > 0)
  .catch(() => false);
console.log(JSON.stringify({ url, out, imgSrc, imgOk, mode: clickBegin ? 'play' : 'briefing' }, null, 2));
await browser.close();
