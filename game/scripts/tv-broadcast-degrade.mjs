/**
 * Post-process stills toward live TV feed (soft + CA + grain). Run after Magnific.
 *
 *   node scripts/tv-broadcast-degrade.mjs
 *   node scripts/tv-broadcast-degrade.mjs --input=path/to.png
 *   node scripts/tv-broadcast-degrade.mjs --input=.../presenter-kwabena-polymath-alt1.png --output=.../presenter-kwabena-polymath-alt1-tvfeed.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const defaultIn = path.join(
  root,
  'dev/tv-presentations/processed/beiza-tv/kwabena-polymath-tv-beiza-master.png',
);
const outDir = path.join(root, 'dev/tv-presentations/processed/beiza-tv');

function argValue(prefix) {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const inputPath = argValue('--input=') ? path.resolve(argValue('--input=')) : defaultIn;
const outputOverride = argValue('--output=');
const shipCcs = process.argv.includes('--ship-ccs');

export async function degradeTv(input, output) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.from(data);

  // Mild chromatic aberration — shift R left, B right on luminance edges
  const shift = 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const xr = Math.min(width - 1, x + shift);
      const xb = Math.max(0, x - shift);
      const ir = (y * width + xr) * channels;
      const ib = (y * width + xb) * channels;
      out[i] = data[ir];
      out[i + 2] = data[ib + 2];
    }
  }

  let pipeline = sharp(out, { raw: { width, height, channels } })
    .blur(0.6)
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.3 })
    .modulate({ saturation: 0.92, brightness: 0.98 });

  // Film grain overlay
  const noise = Buffer.alloc(width * height * 3);
  for (let i = 0; i < noise.length; i += 1) {
    noise[i] = 128 + Math.floor((Math.random() - 0.5) * 18);
  }
  pipeline = pipeline.composite([
    {
      input: await sharp(noise, { raw: { width, height, channels: 3 } }).png().toBuffer(),
      blend: 'soft-light',
      opacity: 0.08,
    },
  ]);

  await pipeline.png({ compressionLevel: 8, quality: 88 }).toFile(output);
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error('Missing', inputPath);
    process.exit(1);
  }

  const base = path.basename(inputPath, path.extname(inputPath));
  const tvOut = outputOverride ? path.resolve(outputOverride) : path.join(outDir, `${base}-tvfeed.png`);
  fs.mkdirSync(path.dirname(tvOut), { recursive: true });
  await degradeTv(inputPath, tvOut);
  console.log('wrote', tvOut);

  if (shipCcs) {
    const ccs = [
      'presentation_1_Chest_Pain_presenter',
      'presentation_2_Altered_Mental_Status_presenter',
      'presentation_3_Pelvic_Pain_presenter',
      'presentation_4_Abdominal_Pain_presenter',
    ];
    for (const slug of ccs) {
      fs.copyFileSync(tvOut, path.join(outDir, `${slug}.png`));
    }
    console.log('Updated CCS presentation_*.png from TV feed master');
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
