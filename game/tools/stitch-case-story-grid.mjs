#!/usr/bin/env node
/** Stitch 6 beat PNGs into case_XXX-grid-2x3.png (no Magnific credits). */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseId = process.argv[2] || '153';
const slug = `case_${String(caseId).replace(/^case_/i, '').padStart(3, '0')}`;
const cacheDir = path.join(root, '.case-story-cache');

const beats = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'].map((ch) => {
  const file = path.join(cacheDir, `${slug}-beat-${ch}.png`);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  return file;
});

const cellW = 768;
const cellH = 432;
const cols = 3;
const rows = 2;

const resized = await Promise.all(
  beats.map((f) => sharp(f).resize(cellW, cellH, { fit: 'cover' }).png().toBuffer()),
);

const composites = resized.map((buf, i) => ({
  input: buf,
  left: (i % cols) * cellW,
  top: Math.floor(i / cols) * cellH,
}));

const out = path.join(cacheDir, `${slug}-grid-2x3.png`);
await sharp({
  create: {
    width: cellW * cols,
    height: cellH * rows,
    channels: 3,
    background: '#0a0a0c',
  },
})
  .composite(composites)
  .png()
  .toFile(out);

console.log('Wrote', out);
