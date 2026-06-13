/**
 * ECG Vector Lab — visual smoke: screenshots + canvas pixel checks.
 * Requires dev server: npm run dev (port 5173)
 *   node scripts/capture-ecg-vector-lab-smoke.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const WEB = process.env.WEB_BASE || 'http://127.0.0.1:5173';
const OUT_DIR = path.join(root, 'docs', 'smoke-screenshots', new Date().toISOString().slice(0, 10));

let fail = 0;

function ok(cond, name, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fail += 1;
  return cond;
}

async function shot(page, name, selector) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.png`);
  const el = selector ? page.locator(selector) : page;
  if (selector) {
    await el.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`   screenshot ${file} (${kb} KB)`);
  return file;
}

/** Sample unified canvas: count non-bg pixels in torso band (body silhouette signal). */
async function canvasBodyStats(page) {
  return page.evaluate(() => {
    const c = document.getElementById('unified');
    if (!c) return { error: 'no canvas' };
    const ctx = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    const dpr = window.devicePixelRatio || 1;
    const img = ctx.getImageData(0, 0, w, h).data;
    const cssW = c.clientWidth;
    const cssH = c.clientHeight;
    const sx = w / cssW;
    const sy = h / cssH;
    const x0 = Math.floor(cssW * 0.35 * sx);
    const x1 = Math.floor(cssW * 0.65 * sx);
    const y0 = Math.floor(cssH * 0.08 * sy);
    const y1 = Math.floor(cssH * 0.92 * sy);
    let bodyGray = 0;
    let dark = 0;
    let gold = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        const r = img[i];
        const g = img[i + 1];
        const b = img[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum >= 28 && lum <= 72 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) bodyGray += 1;
        else if (lum < 28) dark += 1;
        else if (r > 180 && g > 140 && b < 120) gold += 1;
      }
    }
    return { bodyGray, dark, gold, cssW, cssH };
  });
}

async function setHeartLayer(page, on) {
  await page.evaluate((wantOn) => {
    const btn = document.querySelector('[data-layer="heart"]');
    if (!btn) return;
    const isOn = btn.classList.contains('on');
    if (isOn !== wantOn) btn.click();
  }, on);
  await page.waitForTimeout(400);
}

async function main() {
  console.log('=== ECG Vector Lab visual smoke ===\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${WEB}/ecg-vector-lab.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#unified', { timeout: 15000 });
  await page.waitForTimeout(1200);

  const heartOnStats = await canvasBodyStats(page);
  ok(!heartOnStats.error, 'unified canvas readable', heartOnStats.error || '');
  ok(heartOnStats.bodyGray > 2500, 'body silhouette 20% gray pixels (heart ON)', String(heartOnStats.bodyGray));
  ok(heartOnStats.gold > 200, 'scope ring gold pixels', String(heartOnStats.gold));

  await shot(page, 'ecg-lab-heart-on', '.hero-viewport');

  await setHeartLayer(page, false);
  const heartOffStats = await canvasBodyStats(page);
  await shot(page, 'ecg-lab-heart-off', '.hero-viewport');

  const bodyRatio = heartOffStats.bodyGray / Math.max(1, heartOnStats.bodyGray);
  ok(bodyRatio > 0.75 && bodyRatio < 1.35, 'body silhouette stable when heart toggled off', `on=${heartOnStats.bodyGray} off=${heartOffStats.bodyGray} ratio=${bodyRatio.toFixed(2)}`);
  ok(heartOffStats.bodyGray > 2500, '20% gray body visible with heart off', String(heartOffStats.bodyGray));

  await setHeartLayer(page, true);
  await page.locator('.lead-pill[data-lead="aVF"]').click();
  await page.waitForTimeout(400);
  const soloRows = await page.evaluate(() => {
    const on = [...document.querySelectorAll('.lead-pill[data-lead].on')]
      .map((b) => b.dataset.lead)
      .filter((k) => k !== 'all' && k !== 'none');
    return { count: on.length, names: on };
  });
  ok(soloRows.count === 1 && soloRows.names[0] === 'aVF', 'click lead isolates strip to one lead', JSON.stringify(soloRows));
  await shot(page, 'ecg-lab-lead-avf-solo', '.lead-strips-wrap');

  await page.mouse.move(900, 400);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(300);
  const zoomHint = await page.locator('#stripZoomHint').textContent();
  ok(/zoom\s+\d+/i.test(zoomHint || ''), 'strip scroll zoom updates hint', zoomHint?.trim());
  await shot(page, 'ecg-lab-strip-zoomed', '.lead-strips-wrap');

  await browser.close();
  console.log(fail ? `\n${fail} visual check(s) failed` : '\nAll visual smoke checks passed');
  console.log(`Screenshots: ${OUT_DIR}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
