/**
 * Audit patient baseplates + cached case portraits.
 * Flags identical byte copies and lists dimensions.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const patientDir = path.join(root, 'public', 'assets', 'patient');
const portraitDir = path.join(root, '.case-portraits');

async function hashFile(p) {
  const buf = await fs.readFile(p);
  return { hash: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16), size: buf.length };
}

async function meta(p) {
  const img = sharp(p);
  const { width, height } = await img.metadata();
  const { hash, size } = await hashFile(p);
  return { path: p, width, height, size, hash };
}

async function main() {
  const plates = [
    'patient-scene.png',
    'patient-scene-female.png',
    'patient-scene-ped-male.png',
    'patient-scene-ped-female.png',
  ];
  console.log('=== Baseplates ===');
  const rows = [];
  for (const name of plates) {
    const p = path.join(patientDir, name);
    try {
      rows.push({ name, ...(await meta(p)) });
    } catch {
      console.log(`MISSING ${name}`);
    }
  }
  for (const r of rows) {
    console.log(`${r.name}: ${r.width}x${r.height} ${r.size}B hash=${r.hash}`);
  }
  const byHash = new Map();
  for (const r of rows) {
    if (!byHash.has(r.hash)) byHash.set(r.hash, []);
    byHash.get(r.hash).push(r.name);
  }
  for (const [h, names] of byHash) {
    if (names.length > 1) console.log(`⚠ DUPLICATE hash ${h}: ${names.join(', ')}`);
  }
  if (rows.find((r) => r.name === 'patient-scene-female.png')?.hash === rows.find((r) => r.name === 'patient-scene.png')?.hash) {
    console.log('⚠ female plate is byte-identical to male');
  }

  console.log('\n=== Cached portraits (identical to ped-male baseplate) ===');
  const pedMale = rows.find((r) => r.name === 'patient-scene-ped-male.png');
  try {
    const files = await fs.readdir(portraitDir);
    for (const f of files.filter((x) => x.endsWith('.png') && !x.includes('_iv') && !x.includes('_mask') && !x.includes('baseline'))) {
      const p = path.join(portraitDir, f);
      const { hash } = await hashFile(p);
      if (pedMale && hash === pedMale.hash) {
        console.log(`  ${f} — unchanged from ped-male baseplate`);
      }
    }
  } catch {
    console.log('  (no .case-portraits dir)');
  }
}

main().catch(console.error);
