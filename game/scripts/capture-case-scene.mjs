/** Capture play-screen screenshot for case 058 (verify patient scene visible). */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'ccs_screenshots', '_debug');
const WEB = process.env.WEB_BASE || 'http://localhost:5173';

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    localStorage.setItem(
      'schoonmaker_audience_profile',
      JSON.stringify({
        level: 'advanced',
        condition: 'diabetes',
        playRole: 'doctor',
        difficulty: 'standard',
        timerSeconds: 150,
      }),
    );
  });
  await page.goto(WEB, { waitUntil: 'networkidle', timeout: 30000 });

  // Open first case via browse if available
  await page.getByRole('button', { name: /^play$/i }).click({ timeout: 10000 });
  await page.waitForTimeout(600);

  const browse = page.getByRole('button', { name: /browse all cases/i }).first();
  if (await browse.isVisible().catch(() => false)) {
    await browse.click();
    await page.waitForTimeout(800);
  }

  const case58 = page.locator('button, a').filter({ hasText: /^58$|case 58|#58/i }).first();
  if (await case58.isVisible().catch(() => false)) {
    await case58.click();
    await page.waitForTimeout(800);
  }

  const playCase = page.getByRole('button', { name: /play case/i }).first();
  if (await playCase.isVisible().catch(() => false)) {
    await playCase.click();
    await page.waitForTimeout(600);
  }

  const begin = page.getByRole('button', { name: /begin|start case|enter case/i }).first();
  if (await begin.isVisible().catch(() => false)) {
    await begin.click();
    await page.waitForTimeout(1500);
  }

  const sceneImg = page.locator('.game-scene img.patient-scene-img').first();
  await sceneImg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

  const info = await page.evaluate(() => {
    const img = document.querySelector('.game-scene img.patient-scene-img');
    if (!img) return { hasImg: false };
    const r = img.getBoundingClientRect();
    const style = getComputedStyle(img);
    return {
      hasImg: true,
      src: img.getAttribute('src')?.slice(0, 100),
      opacity: style.opacity,
      w: r.width,
      h: r.height,
    };
  });

  const outPath = path.join(outDir, 'play-case-scene-check.png');
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Screenshot:', outPath);
  console.log('Scene info:', JSON.stringify(info, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
