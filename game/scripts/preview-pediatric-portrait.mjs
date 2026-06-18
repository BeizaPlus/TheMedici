/**
 * Preview pediatric portrait for a case — uses wired patientPediatricRefs + ped baseplate.
 *   node scripts/preview-pediatric-portrait.mjs 089
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.resolve(__dirname, '..');
const MEWORLD_ROOT = path.resolve(GAME_ROOT, '..');

dotenv.config({ path: path.join(MEWORLD_ROOT, '.env') });
dotenv.config({ path: path.join(GAME_ROOT, '.env') });

const caseId = String(process.argv[2] || '089').padStart(3, '0');

async function main() {
  const { getCaseById } = await import(pathToFileURL(path.join(GAME_ROOT, 'src/data/useCcsCatalog.js')).href);
  const { buildCaseChatContext } = await import(pathToFileURL(path.join(GAME_ROOT, 'src/lib/caseChat.js')).href);
  const { buildPortraitPrompt, generatePortraitWithFallback } = await import(
    pathToFileURL(path.join(GAME_ROOT, 'server/casePortrait.js')).href,
  );
  const { readBaseplateBuffer, fitToBaseplate, bufferToBase64 } = await import(
    pathToFileURL(path.join(GAME_ROOT, 'server/portraitFrame.js')).href,
  );

  const caseData = getCaseById(caseId);
  if (!caseData) {
    console.error(`Case ${caseId} not found`);
    process.exit(1);
  }

  const caseContext = buildCaseChatContext(caseData);
  console.log('Demographics:', JSON.stringify(caseContext.patientDemographics, null, 2));

  const prompt = buildPortraitPrompt(caseContext, { variant: 'base' });
  console.log('\n--- Portrait prompt (tail) ---\n', prompt.slice(-600));

  const plate = await readBaseplateBuffer(GAME_ROOT, caseContext);
  console.log(`\nBaseplate: ${plate.relPath} (${plate.sex})`);

  const editBase64 = bufferToBase64(await fitToBaseplate(plate.buffer));
  console.log('Generating with Magnific/fallback…');

  const { b64, provider } = await generatePortraitWithFallback({
    imageBase64: editBase64,
    mimeType: 'image/png',
    prompt,
  });

  const outDir = path.join(GAME_ROOT, 'docs', 'portrait-previews');
  await fsp.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `case-${caseId}-pediatric-preview.png`);
  await fsp.writeFile(outFile, Buffer.from(b64, 'base64'));
  console.log(`\n✅ Saved ${outFile} (${provider})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
