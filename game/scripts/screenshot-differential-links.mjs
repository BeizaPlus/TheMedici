import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetCase = Number(process.argv[2] || 151);
const out =
  process.argv[3] ||
  path.join(__dirname, '..', 'screenshots', `diff-case-links-${targetCase}.png`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addInitScript(() => {
  localStorage.setItem(
    'schoonmaker_audience_profile',
    JSON.stringify({
      level: 'advanced',
      condition: 'diabetes',
      playRole: 'doctor',
      difficulty: 'standard',
      timerSeconds: 600,
      nameRegion: 'us',
    }),
  );
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 60000 });
await page.getByRole('button', { name: /Differentials/i }).click();
await page.waitForSelector('.diff-case-ref', { timeout: 15000 });

for (let i = 0; i < 220; i += 1) {
  const counter = (await page.locator('.diff-counter').textContent()) || '';
  if (counter.includes(`Case ${targetCase}`)) break;
  await page.getByRole('button', { name: /Next/i }).click();
  await page.waitForTimeout(80);
}

await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: false });
const refs = await page.locator('.diff-case-ref').textContent();
console.log(JSON.stringify({ out, targetCase, refs: refs?.trim() }, null, 2));
await browser.close();
