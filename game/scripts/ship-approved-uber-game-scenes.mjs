/**
 * Copy Steve-approved GAME-SCENE trace PNGs → public/assets/patient/uber/<slug>-GAME-SCENE.png
 * Updates patientUberRefs.json gameScene* fields.
 *
 *   node scripts/ship-approved-uber-game-scenes.mjs
 *   node scripts/ship-approved-uber-game-scenes.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pending = path.join(root, 'dev/uber-portrait-refs/game-scenes-pending');
const publicUber = path.join(root, 'public/assets/patient/uber');
const refsPath = path.join(root, 'src/data/patientUberRefs.json');

const dryRun = process.argv.includes('--dry-run');

/** slug → approved trace basename in game-scenes-pending */
const SHIP_MAP = [
  {
    slug: 'copper-afro-headwrap-africa',
    trace: 'copper-afro-headwrap-africa-GAME-SCENE-alt2-3d-v3-20260618-approved-pending-ship.png',
    alt: 'alt2-3d-v3',
    uberCases: ['U01'],
  },
  {
    slug: 'vitiligo-wink-diastema',
    trace: 'vitiligo-wink-diastema-GAME-SCENE-alt2-approved-pending-ship.png',
    alt: 'alt2',
    uberCases: ['U02'],
  },
  {
    slug: 'hijab-albino-freckles',
    trace: 'hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618-approved-pending-ship.png',
    alt: 'alt2-v2',
    uberCases: ['U03', 'U05'],
  },
  {
    slug: 'albino-male-freckles-profile',
    trace: 'albino-male-freckles-profile-GAME-SCENE-alt2-approved-pending-ship.png',
    alt: 'alt2',
    uberCases: ['U04'],
  },
  {
    slug: 'craniofacial-asymmetry-goatee',
    trace: 'craniofacial-asymmetry-goatee-GAME-SCENE-alt2-approved-pending-ship.png',
    alt: 'alt2',
    uberCases: ['U06'],
  },
  {
    slug: 'nevus-speckled-laugh',
    trace: 'nevus-speckled-laugh-GAME-SCENE-alt2-anamorphic-v2-20260618-approved-pending-ship.png',
    alt: 'alt2-anamorphic-v2',
    uberCases: ['U07'],
  },
  {
    slug: 'subway-afro-dandy',
    trace: 'subway-afro-dandy-GAME-SCENE-alt1-approved-pending-ship.png',
    alt: 'alt1',
    uberCases: ['U08'],
  },
];

const shippedAt = new Date().toISOString().slice(0, 10);

function main() {
  fs.mkdirSync(publicUber, { recursive: true });
  const refs = JSON.parse(fs.readFileSync(refsPath, 'utf8'));
  const log = [];

  for (const row of SHIP_MAP) {
    const src = path.join(pending, row.trace);
    const destName = `${row.slug}-GAME-SCENE.png`;
    const dest = path.join(publicUber, destName);
    if (!fs.existsSync(src)) {
      console.error('missing trace:', src);
      process.exitCode = 1;
      continue;
    }
    if (!dryRun) {
      fs.copyFileSync(src, dest);
      const entry = refs.refs[row.slug];
      if (entry) {
        entry.gameSceneFile = destName;
        entry.gameSceneStatus = 'approved';
        entry.gameSceneAlt = row.alt;
        entry.gameSceneShippedFrom = row.trace;
        entry.gameSceneShippedAt = shippedAt;
      }
    }
    log.push({ ...row, publicPath: `public/assets/patient/uber/${destName}` });
    console.log(dryRun ? '[dry-run]' : 'shipped', destName, '←', row.trace, '→', row.uberCases.join(', '));
  }

  if (!dryRun) {
    fs.writeFileSync(refsPath, `${JSON.stringify(refs, null, 2)}\n`);
    const wiredDoc = path.join(root, 'dev/uber-portrait-refs/WIRED_UBER_CASES.md');
    const lines = [
      '# Wired Uber case preview plates',
      '',
      `**Shipped:** ${shippedAt} · **Script:** \`scripts/ship-approved-uber-game-scenes.mjs\``,
      '',
      '| Uber case | Patient | Slug | Public file | Approved trace |',
      '|-----------|---------|------|-------------|----------------|',
      ...log.map(
        (r) =>
          `| ${r.uberCases.join(', ')} | ${refs.refs[r.slug]?.label || r.slug} | \`${r.slug}\` | \`${r.publicPath}\` | \`${r.trace}\` |`,
      ),
      '',
      '## Not wired (approved bank / psychiatric — not U01–U08)',
      '',
      '| Trace | Role |',
      '|-------|------|',
      '| `pipe-tweed-mustache-bank-GAME-SCENE-alt1-angle-lock-20260618-approved-pending-ship.png` | Bank reference only |',
      '| `distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v3-20260618-approved-pending-ship.png` | Psychiatric lunatic-pass pool |',
      '',
      '## Smoke pass (main game)',
      '',
      '```powershell',
      'cd C:\\Users\\steve\\MeWorld\\game',
      'npm run dev',
      '# Open each: http://127.0.0.1:5173/?case=U01 … U08',
      '```',
      '',
      'Case browser preview uses Tier A plate via `CaseSelectionScenePreview` + `resolveUberCasePreviewScene()`.',
      '',
      '## Copy to study (after smoke pass)',
      '',
      '```powershell',
      'cd C:\\Users\\steve\\MeWorld',
      'powershell -File scripts\\create-study-snapshot.ps1',
      '```',
      '',
      'See `docs/STUDY_MODE.md` — study is a frozen robocopy; run snapshot when main is good.',
      '',
    ];
    fs.writeFileSync(wiredDoc, lines.join('\n'));
    console.log('wrote', wiredDoc);
  }
}

main();
