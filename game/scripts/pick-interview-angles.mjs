/**
 * Copy curated interview angle picks + write INTERVIEW_ANGLE_CARD.md
 *
 *   node scripts/pick-interview-angles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'dev', 'tv-presentations', 'interview-ref', 'CXKCoFz3WRs');
const anglesDir = path.join(base, 'angles');
const framesRoot = path.join(base, 'frames');

/** source path relative to frames/ */
const PICKS = [
  {
    id: '01-guest-mcu-black-shirt-early',
    src: 'interval/segment_600-900/segment_600-900_abs00600s.png',
    absSec: 600,
    shot: 'Guest MCU — opening beat',
    lens: '~85mm, shallow DOF',
    notes:
      'Opening guest frame — white tee, lavalier, kitchen/lobby blur. Establish guest axis before host cuts.',
  },
  {
    id: '02-host-mcu-attentive',
    src: 'interval/segment_600-900/segment_600-900_abs00720s.png',
    absSec: 720,
    shot: 'Host MCU',
    lens: '~85mm, f/2.8, shallow DOF',
    notes:
      'Interviewer black shirt, notepad, plants + blinds bokeh. Recreate as **Kwabena**: BEIZA black ribbed knit, gold lion chest, boom mic; same MCU height.',
  },
  {
    id: '03-host-mcu-laugh-steve-anchor',
    src: 'interval/segment_2300-2500/segment_2300-2500_abs02326s.png',
    absSec: 2326,
    shot: 'Host MCU — reaction',
    lens: '~85mm, soft key camera-right',
    notes:
      '**Steve anchor frame (t=2326).** Host laughing, eyes closed — candid reaction beat. Primary reference for Polymath session tone.',
  },
  {
    id: '04-guest-mcu-neutral',
    src: 'interval/segment_2300-2500/segment_2300-2500_abs02300s.png',
    absSec: 2300,
    shot: 'Guest MCU',
    lens: '~85mm, shallow DOF',
    notes:
      'Guest white tee, lavalier center, looking off left to host. Swap to on-brand guest wardrobe; keep lavalier + lead room left.',
  },
  {
    id: '05-guest-mcu-speaking',
    src: 'interval/segment_600-900/segment_600-900_abs00840s.png',
    absSec: 840,
    shot: 'Guest MCU — mid answer',
    lens: '~85mm',
    notes: 'Mouth open mid-speech; strong lead room. Match in Polymath lobby background blur.',
  },
  {
    id: '06-guest-mcu-somber',
    src: 'interval/segment_1800-2100/segment_1800-2100_abs01900s.png',
    absSec: 1900,
    shot: 'Guest MCU — downcast',
    lens: '~85mm, low-key',
    notes: 'Emotional beat — eyes down, tense jaw. Same camera axis as 04/05.',
  },
  {
    id: '07-guest-mcu-profile-host-ots',
    src: 'interval/segment_2300-2500/segment_2300-2500_abs02440s.png',
    absSec: 2440,
    shot: 'Guest MCU (host side / OTS feel)',
    lens: '~85mm, guest screen-right',
    notes:
      'Guest in black shirt variant, looking off-camera right — reads as over-host-shoulder energy without showing host back.',
  },
  {
    id: '08-host-mcu-notepad',
    src: 'scenes/segment_600-900/segment_600-900_scene_abs00650s.png',
    absSec: 650,
    shot: 'Host MCU — scene cut',
    lens: '~85mm',
    notes: 'Clean scene-change host frame; notepad visible. Kwabena + BEIZA lion + lower-third.',
  },
  {
    id: '09-guest-mcu-late-tension',
    src: 'interval/segment_2300-2500/segment_2300-2500_abs02490s.png',
    absSec: 2490,
    shot: 'Guest MCU — late interview',
    lens: '~85mm',
    notes: 'Pre-walkout tension; Moncler/logo chest — replace with BEIZA guest branding if needed.',
  },
  {
    id: '10-walkout-scene-cut',
    src: 'scenes/segment_2300-2500/segment_2300-2500_scene_abs02448s.png',
    absSec: 2448,
    shot: 'Guest MCU — scene cut (walkout arc)',
    lens: 'Cutaway on same axis',
    notes: 'Use for exit / uncomfortable beat before guest leaves set.',
  },
  {
    id: '11-host-mcu-laugh-alt',
    src: 'scenes/segment_2300-2500/segment_2300-2500_scene_abs02435s.png',
    absSec: 2435,
    shot: 'Host MCU — alt reaction cut',
    lens: 'Scene-change crop',
    notes: 'Alternate host reaction in walkout segment — keep for edit variety.',
  },
  {
    id: '12-guest-mcu-end-segment',
    src: 'interval/segment_2300-2500/segment_2300-2500_abs02498s.png',
    absSec: 2498,
    shot: 'Guest MCU — end of extract',
    lens: '~85mm',
    notes: 'Final seconds before 2500s — neutral hold for outro or cut to wide.',
  },
];

function copyPick(pick) {
  const srcPath = path.join(framesRoot, pick.src);
  if (!fs.existsSync(srcPath)) {
    console.warn('missing', pick.src);
    return null;
  }
  const dest = path.join(anglesDir, `${pick.id}.png`);
  fs.copyFileSync(srcPath, dest);
  return dest;
}

function writeAngleCard(rows) {
  const lines = [
    '# Interview angle card — 60 Minutes AU (CXKCoFz3WRs)',
    '',
    '**Source:** [Looksmaxxer Clavicular interview](https://www.youtube.com/watch?v=CXKCoFz3WRs&t=2326s) (60 Minutes Australia)',
    '',
    '**Steve anchor:** `03-host-mcu-laugh-steve-anchor.png` @ **38:46** (2326s)',
    '',
    '**Recreate in Polymath / BEIZA lobby** (same scene as `dev/tv-presentations/processed/beiza-tv/`):',
    '- Host = **Kwabena Oppong** — BEIZA ribbed knit, gold lion, lavalier/boom',
    '- Lower third = BEIZA lion + `KWABENA OPPONG` / `POLYMATH`',
    '- Background = blue reception / modern lobby bokeh (not 60 Minutes set verbatim)',
    '- Finish = light TV feed degrade (`npm run tv:degrade`)',
    '',
    '| File | Timestamp | Shot type | Lens feel | BEIZA / Kwabena notes |',
    '|------|-----------|-----------|-----------|------------------------|',
  ];

  for (const r of rows) {
    lines.push(
      `| \`${r.id}.png\` | ${formatTs(r.absSec)} (${r.absSec}s) | ${r.shot} | ${r.lens} | ${r.notes.replace(/\|/g, '/')} |`,
    );
  }

  lines.push('');
  lines.push('## Extraction stats');
  lines.push('');
  const manifestPath = path.join(base, 'meta', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const seg of m.segments || []) {
      lines.push(
        `- \`${seg.label}\`: ${seg.intervalFrames} interval (every 2s) + ${seg.sceneFrames} scene cuts`,
      );
    }
  }
  lines.push('');
  lines.push('## Re-run');
  lines.push('');
  lines.push('```powershell');
  lines.push('cd C:\\Users\\steve\\MeWorld\\game');
  lines.push('npm run extract:interview-frames');
  lines.push('node scripts/pick-interview-angles.mjs');
  lines.push('```');

  fs.writeFileSync(path.join(base, 'INTERVIEW_ANGLE_CARD.md'), `${lines.join('\n')}\n`);
}

function formatTs(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

fs.mkdirSync(anglesDir, { recursive: true });
const copied = [];
for (const pick of PICKS) {
  const dest = copyPick(pick);
  if (dest) copied.push(pick);
}
writeAngleCard(copied);
console.log(`Copied ${copied.length} angles → ${anglesDir}`);
console.log('Wrote INTERVIEW_ANGLE_CARD.md');
