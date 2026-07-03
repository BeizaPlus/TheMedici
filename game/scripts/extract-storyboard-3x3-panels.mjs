/**
 * Extract 3×3 panels from a 16:9 storyboard plate (equal cols/rows → 16:9 cells).
 * Usage: node scripts/extract-storyboard-3x3-panels.mjs [plate.png] [outDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const plate =
  process.argv[2] ||
  path.join(
    root,
    'dev/uber-portrait-refs/video-pending/blue-hijab-body-testing-storyboard-3x3-16x9-v2.png',
  );
const outDir =
  process.argv[3] ||
  path.join(root, 'dev/uber-portrait-refs/video-pending/case-090-3x3-panels');

const labels = [
  '01-r1c1-desert-wide',
  '02-r1c2-camel-mouth',
  '03-r1c3-family-watching',
  '04-r2c1-door-lock',
  '05-r2c2-under-bed-feet',
  '06-r2c3-hospital-bed',
  '07-r3c1-camel-neck',
  '08-r3c2-bedside-husband',
  '09-r3c3-oasis-mirage',
];

const COLS = 3;
const ROWS = 3;

async function main() {
  const { width, height } = await sharp(plate).metadata();
  const cw = Math.floor(width / COLS);
  const ch = Math.floor(height / ROWS);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Plate ${width}×${height} → cells ${cw}×${ch}`);

  let i = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const name = `clip-${labels[i]}.png`;
      const out = path.join(outDir, name);
      await sharp(plate)
        .extract({ left: col * cw, top: row * ch, width: cw, height: ch })
        .png()
        .toFile(out);
      console.log('Wrote', out);
      i += 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
