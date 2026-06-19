#!/usr/bin/env node
/**
 * Enhance a dropped teaching x-ray via Magnific REST (reference-guided).
 * Usage: node scripts/enhance-case-teaching-xray.mjs <caseId> <sourcePng> [outBasename]
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.resolve(__dirname, '..');

async function loadEnv() {
  for (const envPath of [
    'C:/Users/steve/.cursor/master.env',
    path.join(gameRoot, '../.env'),
    path.join(gameRoot, '.env'),
  ]) {
    try {
      const raw = await fsp.readFile(envPath, 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {
      /* missing file */
    }
  }
}

await loadEnv();

const { generateImageEditWithMagnific, magnificApiKey } = await import(
  pathToFileURL(path.join(gameRoot, 'server/magnificImage.js')).href
);

const [caseIdArg, sourceArg, outBaseArg] = process.argv.slice(2);
if (!caseIdArg || !sourceArg) {
  console.error(
    'Usage: node scripts/enhance-case-teaching-xray.mjs <caseId> <sourcePng> [outBasename]',
  );
  process.exit(1);
}

const caseId = String(caseIdArg).padStart(3, '0');
const sourcePath = path.resolve(sourceArg);
const outDir = path.join(gameRoot, 'docs', 'cases', `case-${caseId}`, 'imaging');
const outBase =
  outBaseArg ||
  `case-${caseId}-coarctation-xray-magnific-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}`;
const promptPath = path.join(outDir, `case-${caseId}-coarctation-xray-magnific-prompt.txt`);
const prompt = await fsp.readFile(promptPath, 'utf8').catch(async () => {
  const fallback = path.join(outDir, path.basename(sourcePath, path.extname(sourcePath)) + '-magnific-prompt.txt');
  return fsp.readFile(fallback, 'utf8');
});

if (!magnificApiKey()) {
  console.error('MAGNIFIC_API_KEY missing — add to MeWorld/.env or master.env');
  process.exit(1);
}

const buf = await fsp.readFile(sourcePath);
const imageBase64 = buf.toString('base64');
console.log('Magnific enhance:', sourcePath, buf.length, 'bytes');

const result = await generateImageEditWithMagnific({
  imageBase64,
  mimeType: 'image/png',
  prompt: prompt.trim(),
  aspectRatio: '16:9',
  resolution: '2K',
  referenceText:
    'Match the two-panel teaching layout exactly — Panel A rib notching, Panel B chest x-ray figure-3 sign. Preserve anatomy; only improve exposure and clarity.',
});

await fsp.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `${outBase}.png`);
await fsp.writeFile(outPath, result);
console.log('Wrote', outPath, result.length, 'bytes');
