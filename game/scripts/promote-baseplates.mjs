/**
 * Promote dev/anatomic-plates/raw picks → public/assets/patient baseplates (1536×864).
 * Usage: node scripts/promote-baseplates.mjs [--from-raw]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'assets', 'patient');
const rawDir = path.join(root, 'dev', 'anatomic-plates', 'raw');

const W = 1536;
const H = 864;

const MAP = {
  'patient-scene.png': 'male-ed-anatomic-plate-a.png',
  'patient-scene-female.png': 'female-ed-anatomic-plate-a.png',
  'patient-scene-ped-male.png': 'ped-male-ed-anatomic-plate-a.png',
  'patient-scene-ped-female.png': 'ped-female-ed-anatomic-plate-a.png',
};

async function fit(inPath, outPath) {
  await sharp(inPath)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(outPath);
  const st = await fs.stat(outPath);
  console.log(`✅ ${path.basename(outPath)} ← ${path.basename(inPath)} (${st.size} bytes)`);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  for (const [outName, rawName] of Object.entries(MAP)) {
    let src = path.join(rawDir, rawName);
    try {
      await fs.access(src);
    } catch {
      const fallback =
        outName.includes('ped-male') || outName.includes('ped-female')
          ? outName.includes('female')
            ? 'female-ed-anatomic-plate-a.png'
            : 'male-ed-anatomic-plate-a.png'
          : null;
      if (!fallback) {
        console.warn(`⚠ skip ${outName} — missing ${rawName}`);
        continue;
      }
      src = path.join(rawDir, fallback);
      console.warn(`⚠ ${outName} — using fallback ${fallback} (run Magnific ped gen)`);
    }
    const dest = path.join(outDir, outName);
    await fit(src, dest);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
