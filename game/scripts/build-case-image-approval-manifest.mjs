#!/usr/bin/env node
/** Build manifest for public/case-image-approval/ — case → portrait / uber / story images. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const portraitDir = path.join(root, '.case-portraits');
const storyDir = path.join(root, '.case-story-cache');
const outDir = path.join(root, 'public', 'case-image-approval');
const uberRefs = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/patientUberRefs.json'), 'utf8'),
);

function padId(id) {
  const raw = String(id ?? '').replace(/^case_/i, '').trim();
  return /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw;
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function storyAssets(caseId) {
  const slug = `case_${padId(caseId)}`;
  const files = fs.existsSync(storyDir) ? fs.readdirSync(storyDir) : [];
  const prefix = `${slug}`;
  const beats = files
    .filter((f) => f.startsWith(`${prefix}-beat-`) && f.endsWith('.png'))
    .sort();
  return {
    prose: files.includes(`${slug}.json`) ? `${slug}.json` : null,
    master: files.includes(`${slug}-master.png`) ? `${slug}-master.png` : null,
    grid: files.includes(`${slug}-grid-2x3.png`) ? `${slug}-grid-2x3.png` : null,
    beats,
  };
}

function portraitRow(caseId) {
  const slug = `case_${padId(caseId)}`;
  const png = path.join(portraitDir, `${slug}.png`);
  const meta = readJson(path.join(portraitDir, `${slug}.json`));
  if (!fs.existsSync(png)) return null;
  return {
    file: `${slug}.png`,
    cachedAt: meta?.cachedAt || null,
    uberRefSlug: meta?.uberRefSlug || null,
    patientName: meta?.persona?.patientName || meta?.analysis?.patientName || null,
    provider: meta?.provider || null,
  };
}

const caseIds = new Set();
if (fs.existsSync(portraitDir)) {
  for (const f of fs.readdirSync(portraitDir)) {
    const m = /^case_(\d+)\.png$/i.exec(f);
    if (m) caseIds.add(m[1]);
  }
}
for (const id of Object.keys(uberRefs.caseSlugs || {})) {
  caseIds.add(padId(id));
}
if (fs.existsSync(storyDir)) {
  for (const f of fs.readdirSync(storyDir)) {
    const m = /^case_(\d+)\.json$/i.exec(f);
    if (m) caseIds.add(m[1]);
  }
}

const cases = [...caseIds]
  .sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  })
  .map((id) => {
    const expectedUber = uberRefs.caseSlugs?.[id] || uberRefs.caseSlugs?.[padId(id)] || null;
    const uber = expectedUber ? uberRefs.refs?.[expectedUber] : null;
    const portrait = portraitRow(id);
    const story = storyAssets(id);
    const uberMismatch =
      Boolean(expectedUber) && portrait?.uberRefSlug !== expectedUber;
    const charMapFile = uber?.mapFile || null;
    return {
      id,
      title: uber?.label || `Case ${id}`,
      expectedUber,
      uberLabel: uber?.label || null,
      charMapUrl: charMapFile ? `/assets/patient/uber/${charMapFile}` : null,
      sourceRef: uber?.sourceFile
        ? `/dev-refs/uber/${uber.sourceFile}`
        : null,
      portrait,
      story,
      flags: {
        hasPortrait: Boolean(portrait),
        hasCharMap: Boolean(charMapFile),
        hasStoryProse: Boolean(story.prose),
        hasStoryMaster: Boolean(story.master),
        hasStoryGrid: Boolean(story.grid),
        beatCount: story.beats.length,
        uberMismatch,
        needsPortraitRegen: uberMismatch || !portrait,
        needsStoryImages: Boolean(story.prose) && !story.grid && story.beats.length === 0,
      },
    };
  });

fs.mkdirSync(outDir, { recursive: true });
const manifest = {
  generatedAt: new Date().toISOString(),
  apiImageBase: '/case-portraits',
  storyImageBase: '/case-story-images',
  caseCount: cases.length,
  cases,
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outDir}/manifest.json — ${cases.length} cases`);
const ngavu = cases.find((c) => c.id === '153');
if (ngavu) {
  console.log('Case 153:', JSON.stringify(ngavu.flags, null, 2));
}
