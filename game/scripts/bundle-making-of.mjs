/**
 * Bundle smoke screenshots + reference art into docs/making-of/ for BTS articles & social.
 * Run: node scripts/bundle-making-of.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '..');
const outRoot = path.join(root, 'docs', 'making-of');
const today = new Date().toISOString().slice(0, 10);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyIfExists(src, dest, note = '') {
  if (!fs.existsSync(src)) return null;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  const stat = fs.statSync(dest);
  return {
    src: path.relative(repoRoot, src).replace(/\\/g, '/'),
    dest: path.relative(repoRoot, dest).replace(/\\/g, '/'),
    bytes: stat.size,
    note,
  };
}

function copyDirPngs(srcDir, destDir, note = '') {
  if (!fs.existsSync(srcDir)) return [];
  ensureDir(destDir);
  const entries = [];
  for (const name of fs.readdirSync(srcDir)) {
    if (!/\.(png|jpg|jpeg|webp)$/i.test(name)) continue;
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    const copied = copyIfExists(src, dest, note);
    if (copied) entries.push({ ...copied, file: name });
  }
  return entries;
}

function readTextIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

// --- copy screenshots ---
const smokeSrc = path.join(root, 'docs', 'smoke-screenshots');
const smokeDest = path.join(outRoot, 'screenshots', 'smoke');
const smokeEntries = [];

if (fs.existsSync(smokeSrc)) {
  for (const dateFolder of fs.readdirSync(smokeSrc)) {
    const srcDay = path.join(smokeSrc, dateFolder);
    if (!fs.statSync(srcDay).isDirectory()) continue;
    const destDay = path.join(smokeDest, dateFolder);
    for (const e of copyDirPngs(srcDay, destDay, `smoke capture ${dateFolder}`)) {
      smokeEntries.push({ ...e, date: dateFolder, category: 'smoke' });
    }
  }
}

// --- reference + anatomic ---
const refDest = path.join(outRoot, 'screenshots', 'reference');
const anatomicDest = path.join(outRoot, 'screenshots', 'anatomic-plates');
const refEntries = [];

const refFiles = [
  [path.join(repoRoot, 'dev', 'screenshots', 'reference', 'patient-bed-topdown.png'), 'Early ED mood reference'],
  [path.join(repoRoot, 'dev', 'screenshots', 'reference', 'ed-floor-plan-mezzanine.png'), 'ED floor plan concept'],
];

for (const [src, note] of refFiles) {
  const base = path.basename(src);
  const copied = copyIfExists(src, path.join(refDest, base), note);
  if (copied) refEntries.push({ ...copied, file: base, category: 'reference' });
}

const anatomicFiles = [
  ['male-ed-anatomic-plate-anatomy.png', 'IV portal scope — male (green torso, red IV zones)'],
  ['female-ed-anatomic-plate-anatomy.png', 'IV portal scope — female (lady reference)'],
  ['male-ed-anatomic-plate-a.png', 'Male crop lock base plate'],
  ['female-ed-anatomic-plate-a.png', 'Female anatomic base plate (regenerated)'],
  ['male-ed-anatomic-plate-b.png', 'Male anatomic plate alt'],
  ['female-ed-anatomic-plate-b.png', 'Female anatomic plate alt'],
];

for (const [name, note] of anatomicFiles) {
  const src = path.join(root, 'dev', 'anatomic-plates', 'raw', name);
  const copied = copyIfExists(src, path.join(anatomicDest, name), note);
  if (copied) refEntries.push({ ...copied, file: name, category: 'anatomic-plate' });
}

// --- docs copy ---
const docsDest = path.join(outRoot, 'docs');
ensureDir(docsDest);

const docCopies = [
  [path.join(repoRoot, 'SESSION_CHANGES_2026-06-02.md'), 'session-2026-06-02.md'],
  [path.join(root, 'AGENTS.md'), 'AGENTS-handoff.md'],
  [path.join(root, 'dev', 'anatomic-plates', 'IV_ACCESS_PORTALS.json'), 'IV_ACCESS_PORTALS.json'],
  [path.join(root, 'dev', 'anatomic-plates', 'README.md'), 'anatomic-plates-README.md'],
];

const copiedDocs = [];
for (const [src, destName] of docCopies) {
  const copied = copyIfExists(src, path.join(docsDest, destName), 'source doc');
  if (copied) copiedDocs.push(copied);
}

// --- FEATURE_TIMELINE.md ---
const timeline = `# TheSchoonMaker — feature timeline (making-of)

Bundled: **${today}** · folder: \`game/docs/making-of/\`

Use this for behind-the-scenes posts, articles, and demo reels. Pair screenshots in \`screenshots/\` with beats below.

---

## Product north star

**TheSchoonMaker** — drag-and-place clinical orders on a cinematic ED patient scene. **181 CCS cases**, React + Vite + Express. Teach Me mode for guided sequencing; practice mode for free exploration.

---

## Timeline (newest first)

### 2026-06-16 — Play UX polish & clinical plates

| Feature | What to show | Screenshot |
|---------|--------------|------------|
| **Results tab + lower-third carousel** | Lab/result text lives in Results tab; on-scene carousel at lower third | Play mode (capture manually) |
| **Practice vs Teach Me results** | Practice = raw values only; Teach Me adds interpretation | Results tab compare |
| **Compare tap = explanation only** | Tapping a stack in review shows rationale card — dock does not reopen | Teach Me compare |
| **Landscape compare rails** | Critical / General tiers, wrapped labels, lower-third layout | Case 4 DKA landscape |
| **Critical tier push-down** | Expanding Critical pushes General down (no truncation) | Flow compare panel |
| **IV access portal scope** | Green = torso exams; red = IV portals; antecubital first | \`screenshots/anatomic-plates/*-anatomy.png\` |
| **Male crop lock** | Full patient crown→toes framing | \`male-ed-anatomic-plate-a.png\` |
| **Female lady plate regen** | Akosua likeness + approved portal scope | \`female-ed-anatomic-plate-a.png\` |
| **Print fix** | Real printable HTML → Microsoft Print to PDF | Result card print |
| **IDM / video guard** | Blob URLs for in-app video (no download overlay) | Welcome / patient scene |

**Smoke set:** \`screenshots/smoke/2026-06-16/\`

---

### 2026-06-13 — ECG Vector Lab

| Feature | Screenshot |
|---------|------------|
| Heart model on/off | \`ecg-lab-heart-on.png\` / \`ecg-lab-heart-off.png\` |
| Single-lead focus (aVF) | \`ecg-lab-lead-avf-solo.png\` |
| Strip zoom | \`ecg-lab-strip-zoomed.png\` |

**Folder:** \`screenshots/smoke/2026-06-12/\` (ECG dated 06-13)

---

### 2026-06-12 — Differential study loop

| Step | File |
|------|------|
| Welcome | \`01-welcome.png\` |
| After physician pick | \`02-after-physician.png\` |
| Differential main | \`03-differential-main.png\` |
| Study Case tab | \`04-study-case-tab.png\` |
| Real World tab | \`05-study-realworld-tab.png\` |
| Floating chat | \`06-floating-chat-open.png\` |

**Folder:** \`screenshots/smoke/2026-06-12/\`

---

### 2026-06-10 — First automated smoke screenshots

Same six-step differential flow — baseline capture pipeline.

**Folder:** \`screenshots/smoke/2026-06-10/\`

---

### 2026-06-02 — Platform foundations (see \`docs/session-2026-06-02.md\`)

- Circular dependency fix (cases load again)
- DeepSeek + OpenAI chat routing
- Floating chat panel (drag, resize, orders + chat)
- Read-aloud (Chatterbox TTS)
- Notes mode, copy thread, favorites
- MeWorld rename from ER doc

---

## Suggested article angles

1. **"Building a CCS trainer that feels like a game, not a quiz"** — welcome → play → teach me arc (\`06-10\` / \`06-12\` smokes)
2. **"Why we locked the camera on the patient bed"** — anatomic plates + crop lock PNGs
3. **"Practice vs Teach Me"** — same case, two philosophies (AGENTS handoff)
4. **"Real patients in the syllabus"** — Real World tab + TSS case (\`05-study-realworld-tab.png\`)
5. **"ECG as a lab, not a slideshow"** — ECG vector lab smokes

---

## Social crop hints

| Asset | Suggested use |
|-------|----------------|
| \`03-differential-main.png\` | LinkedIn hero — dark UI + chief complaint |
| \`*-anatomy.png\` | Thread slide: "where IVs can go" |
| \`ecg-lab-heart-on.png\` | Reel cover — 3D heart + strips |
| \`02-after-physician.png\` | "Choose your lane" carousel first slide |

---

## Re-bundle after new work

\`\`\`powershell
Set-Location C:\\Users\\steve\\MeWorld\\game
node scripts/bundle-making-of.mjs
npm run smoke:differential-session   # refreshes today's smoke PNGs first
\`\`\`
`;

fs.writeFileSync(path.join(outRoot, 'FEATURE_TIMELINE.md'), timeline, 'utf8');

// --- README ---
const readme = `# Making-of bundle — TheSchoonMaker / MeWorld

Self-contained folder for **behind-the-scenes articles**, **LinkedIn posts**, and **demo reels**.

| Path | Contents |
|------|----------|
| \`FEATURE_TIMELINE.md\` | Chronological feature beats + article angles |
| \`MEDIA_INDEX.json\` | Every file with paths, sizes, captions |
| \`screenshots/smoke/\` | Dated Playwright smoke captures |
| \`screenshots/anatomic-plates/\` | IV scope overlays + base plates |
| \`screenshots/reference/\` | Early mood / floor plan refs |
| \`docs/\` | Session notes + AGENTS handoff snapshot |

**Regenerate:** \`node scripts/bundle-making-of.mjs\` from \`game/\`

**Refresh smokes first:** \`npm run dev\` (or servers up) then \`npm run smoke:differential-session\`
`;

fs.writeFileSync(path.join(outRoot, 'README.md'), readme, 'utf8');

// --- MEDIA_INDEX.json ---
const smokeLabels = {
  '01-welcome.png': 'Welcome screen — mode picker',
  '02-after-physician.png': 'After choosing Physician path',
  '03-differential-main.png': 'Differential practice — chief complaint',
  '04-study-case-tab.png': 'Study panel — Case tab (orders workflow)',
  '05-study-realworld-tab.png': 'Study panel — Real World tab',
  '06-floating-chat-open.png': 'Floating case chat open',
  'ecg-lab-heart-on.png': 'ECG Vector Lab — heart model visible',
  'ecg-lab-heart-off.png': 'ECG Vector Lab — heart hidden',
  'ecg-lab-lead-avf-solo.png': 'ECG Vector Lab — aVF lead solo',
  'ecg-lab-strip-zoomed.png': 'ECG Vector Lab — zoomed strip',
};

const index = {
  bundledAt: new Date().toISOString(),
  project: 'TheSchoonMaker / MeWorld',
  root: 'game/docs/making-of',
  counts: {
    smoke: smokeEntries.length,
    reference: refEntries.filter((e) => e.category === 'reference').length,
    anatomicPlates: refEntries.filter((e) => e.category === 'anatomic-plate').length,
    docs: copiedDocs.length,
  },
  smoke: smokeEntries.map((e) => ({
    ...e,
    caption: smokeLabels[e.file] || e.file,
  })),
  reference: refEntries,
  docs: copiedDocs,
};

fs.writeFileSync(path.join(outRoot, 'MEDIA_INDEX.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

console.log(`\n✅ Making-of bundle → ${outRoot}`);
console.log(`   smoke PNGs: ${smokeEntries.length}`);
console.log(`   reference + anatomic: ${refEntries.length}`);
console.log(`   docs: ${copiedDocs.length}`);
console.log(`   FEATURE_TIMELINE.md + MEDIA_INDEX.json written\n`);
