import sharp from 'sharp';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const gameRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(
  readFileSync(path.join(gameRoot, 'dev/scene-camera-lock/SCENE_LOCK.json'), 'utf8'),
);

const { width: ew, height: eh } = lock.exportPixels;
const aspect = ew / eh;
let failed = 0;

for (const [sex, plate] of Object.entries(lock.baseplates)) {
  const abs = path.join(gameRoot, plate.path);
  const meta = await sharp(abs).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const ratio = w / h;
  if (Math.abs(ratio - aspect) > 0.02) {
    console.error(`FAIL ${sex}: aspect ${ratio.toFixed(4)} (expected ~${aspect.toFixed(4)})`);
    failed += 1;
  } else {
    console.log(`OK ${sex}: ${w}x${h} aspect ${ratio.toFixed(4)}`);
  }
}

if (failed) process.exit(1);
console.log('validate-scene-lock: baseplates OK');
