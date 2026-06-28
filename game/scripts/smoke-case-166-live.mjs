/** Live UI capture for case 166. Run with dev:alt up. */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs/smoke-screenshots/2026-06-19/case-166-hemarthrosis');
const WEB = 'http://127.0.0.1:5174';

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('schoonmaker_onboarding_complete', '1');
    localStorage.setItem(
      'schoonmaker_audience_profile',
      JSON.stringify({ level: 'advanced', playRole: 'doctor', difficulty: 'standard', timerSeconds: 600 }),
    );
  });
  const page = await context.newPage();
  await page.goto(`${WEB}/?case=166`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '03-live-briefing-case-166.png') });

  const teachBtn = page.getByRole('button', { name: /teach me/i }).first();
  if (await teachBtn.count()) {
    await teachBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '04-live-teach-me-dock.png') });
  }

  await browser.close();
  console.log('Live screenshots →', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
