/**
 * Offline preview screenshots — medical sequence consequence copy (case 153).
 * Run: node scripts/render-case-153-preview.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMedicalSequenceOffline } from '../src/lib/medicalSequence.js';
import { buildCaseStoryOffline } from '../src/lib/caseStory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const prepared = JSON.parse(fs.readFileSync(path.join(root, 'src/data/preparedCases.json'), 'utf8'));
const caseData = prepared.cases['153'];
const seq = buildMedicalSequenceOffline(caseData);
const story = buildCaseStoryOffline(caseData, {
  sessionContext: { stacksPlaced: ['Urine porphyrins', 'Plasma porphyrins', 'HCV / HIV / Iron studies'] },
});

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function beatCard(beat, i) {
  return `<article class="med-seq-beat">
    <span class="med-seq-beat-num">${i + 1}</span>
    <h4 class="med-seq-beat-title">${esc(beat.title)}</h4>
    <p class="med-seq-beat-caption">${esc(beat.caption)}</p>
    <p class="med-seq-beat-visual">${esc(beat.visualHint)}</p>
    <p class="med-seq-beat-order">Order: <strong>${esc(beat.tiedOrderLabel)}</strong></p>
  </article>`;
}

function medSeqPanel(activeTab, railHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="${path.join(root, 'src/index.css').replace(/\\/g, '/')}">
<link rel="stylesheet" href="${path.join(root, 'src/styles/medical-sequence.css').replace(/\\/g, '/')}">
<style>body{margin:0;background:#0c0c10;padding:20px}.med-seq-overlay{position:relative;background:transparent}</style>
</head><body>
<div class="med-seq-overlay"><div class="med-seq-panel">
<header class="med-seq-head"><div>
<p class="med-seq-kicker">Medical sequence · Case 153</p>
<h2 class="med-seq-title">${esc(caseData.title)} — N'Gavu</h2>
<p class="med-seq-lock">Likeness lock: ${esc(seq.patientLock)}</p>
</div></header>
<div class="med-seq-tabs">
<button class="med-seq-tab${activeTab === 'prequel' ? ' is-active' : ''}">Prequel — at home</button>
<button class="med-seq-tab${activeTab === 'missed' ? ' is-active' : ''}">If orders missed</button>
<button class="med-seq-tab${activeTab === 'saved' ? ' is-active' : ''}">If stabilized in time</button>
</div>
${railHtml}
<p class="med-seq-foot">Source: offline · ${seq.orders.length} orders from standard flow</p>
</div></div></body></html>`;
}

function storyboardPanel() {
  const panels = story.chapters
    .map(
      (ch, i) => `<article class="case-story-storyboard-panel">
      <span class="case-story-storyboard-num">${i + 1}</span>
      <h4>${esc(ch.heading)}</h4>
      <p>${esc(ch.body)}</p>
      <p class="case-story-storyboard-hint"><em>${esc(ch.visualHint || '')}</em></p>
    </article>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="${path.join(root, 'src/index.css').replace(/\\/g, '/')}">
<style>
body{margin:0;background:#0c0c10;padding:20px;color:#e8e6e3;font-family:system-ui}
.case-story-overlay{max-width:1200px;margin:0 auto}
.case-story-storyboard-lock{color:#8ab4f8;font-size:13px;margin-bottom:12px}
.case-story-storyboard-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.case-story-storyboard-panel{background:#16161c;border:1px solid #2a2a32;border-radius:8px;padding:12px}
.case-story-storyboard-num{color:#c9a227;font-weight:700}
.case-story-storyboard-hint{color:#888;font-size:11px;margin-top:8px}
</style></head><body>
<section class="case-story-overlay case-story-storyboard">
<p class="case-story-storyboard-lock">Camera: smart angle per beat — one 2×3 storyboard plate (six panels, varied composition; same MeWorld sculptural style).</p>
<div class="case-story-storyboard-grid">${panels}</div>
</section></body></html>`;
}

const day = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(root, 'docs', 'smoke-screenshots', day, 'case-153-consequences', 'run-preview');
fs.mkdirSync(OUT_DIR, { recursive: true });

const missedHtml = medSeqPanel(
  'missed',
  `<section class="med-seq-rail"><h3 class="med-seq-rail-title">If orders missed</h3><div class="med-seq-rail-track">${seq.missedPath
    .slice(0, 3)
    .map(beatCard)
    .join('')}</div></section>`,
);
const savedHtml = medSeqPanel(
  'saved',
  `<section class="med-seq-rail"><h3 class="med-seq-rail-title">If stabilized in time</h3><div class="med-seq-rail-track">${seq.savedPath
    .slice(0, 3)
    .map(beatCard)
    .join('')}</div></section>`,
);
const storyHtml = storyboardPanel();

const missedFile = path.join(OUT_DIR, 'preview-missed.html');
const savedFile = path.join(OUT_DIR, 'preview-saved.html');
const storyFile = path.join(OUT_DIR, 'preview-storyboard.html');
fs.writeFileSync(missedFile, missedHtml);
fs.writeFileSync(savedFile, savedHtml);
fs.writeFileSync(storyFile, storyHtml);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

for (const [file, outName] of [
  [missedFile, '01-med-seq-orders-missed.png'],
  [savedFile, '02-med-seq-stabilized.png'],
  [storyFile, '04-case-story-storyboard-6-beats.png'],
]) {
  await page.goto(`file:///${file.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const loc = file.includes('story') ? page.locator('.case-story-overlay') : page.locator('.med-seq-panel');
  await loc.screenshot({ path: path.join(OUT_DIR, outName) });
  console.log('📸', outName);
}

await browser.close();
console.log('\nOutput:', OUT_DIR);
