/**
 * Case 166 smoke — order tiers + character map review paths.
 * Run: node scripts/smoke-case-166-preview.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBareEssentialsRows,
  groupTeachCompareRowsByTier,
  ORDER_TIER_META,
} from '../src/lib/caseBareEssentials.js';
import { buildTeachCompareRows } from '../src/lib/teachMeCompare.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs/smoke-screenshots/2026-06-19/case-166-hemarthrosis');
const prepared = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/preparedCases.json'), 'utf8'),
);
const caseData = prepared.cases['166'];
const interventions = caseData.interventions || [];
const interventionById = Object.fromEntries(interventions.map((iv) => [iv.id, iv]));

const { rows } = buildTeachCompareRows({
  interventions,
  interventionById,
  placementOrder: [],
  placed: {},
  nextExpectedId: interventions[0]?.id,
});

const tiers = groupTeachCompareRowsByTier({ rows, caseData, interventions });
const critical = buildBareEssentialsRows({ caseData, interventions, placed: {} });

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tierHtml() {
  return tiers
    .map(
      (tier) => `<section class="tier tier-${tier.id}">
      <h2>${esc(tier.label)} <span class="hint">${esc(tier.hint)}</span></h2>
      <ul>${tier.rows
        .map((r) => `<li><strong>${esc(r.label)}</strong><br><small>${esc(r.why)}</small></li>`)
        .join('')}</ul>
    </section>`,
    )
    .join('');
}

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Case 166 — order tiers</title>
<style>
  body { font-family: system-ui; background: #0c0c10; color: #e8e6e3; padding: 24px; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.4rem; color: #f4f4f6; }
  .meta { color: #c9a227; font-size: 0.85rem; margin-bottom: 20px; }
  .tier { margin-bottom: 24px; padding: 16px; border-radius: 10px; border: 1px solid #2a2a32; background: #14141a; }
  .tier-critical { border-color: rgba(232, 184, 75, 0.45); }
  .tier-general { border-color: rgba(140, 180, 255, 0.35); }
  .tier-misc { border-color: rgba(160, 160, 170, 0.35); }
  .tier h2 { margin: 0 0 12px; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .hint { display: block; font-size: 0.72rem; font-weight: 400; color: #888; text-transform: none; letter-spacing: 0; margin-top: 4px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 10px; }
  .critical-banner { background: rgba(232,184,75,0.12); padding: 12px; border-radius: 8px; margin-bottom: 20px; }
</style></head><body>
<h1>Case 166 · ${esc(caseData.diagnosis)}</h1>
<p class="meta">Patient: ${esc(caseData.patient_name_default)} · Slug: ${esc(caseData.uberFaceSlug)}</p>
<div class="critical-banner"><strong>${esc(critical.title)}</strong><br>${esc(critical.subtitle)}</div>
${tierHtml()}
</body></html>`;

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, 'preview-order-tiers.html');
  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`);
  await page.screenshot({ path: path.join(outDir, '01-order-tiers-critical-general-misc.png'), fullPage: true });

  const mapPath = path.join(
    root,
    'dev/interesting-cases/character-maps-pending/hemarthrosis-athlete-knee-CHARACTER-MAP-alt1.png',
  );
  if (fs.existsSync(mapPath)) {
    await page.setContent(`<html><body style="margin:0;background:#111"><img src="file:///${mapPath.replace(/\\/g, '/')}" style="max-width:100%"/></body></html>`);
    await page.screenshot({ path: path.join(outDir, '02-character-map-interim-ref.png') });
  }

  await browser.close();

  const manifest = {
    caseId: '166',
    generatedAt: new Date().toISOString(),
    screenshots: [
      '01-order-tiers-critical-general-misc.png',
      '02-character-map-interim-ref.png',
    ],
    devReviewUrl: 'http://127.0.0.1:5174/?case=166',
    characterMapReview: 'dev/interesting-cases/character-maps-pending/',
    note: 'Interim character map = source ref until Magnific credits restored',
  };
  fs.writeFileSync(path.join(outDir, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('Wrote smoke preview →', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
