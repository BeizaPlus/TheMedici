/**
 * Scan UWorld HTML zips for trauma / toxicology case blocks (title grep only).
 *
 *   node scripts/inventory-uword-trauma-tox.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '..', 'data', 'uword-incoming', 'trauma-tox-scan');
const outJson = path.join(outDir, 'candidates.json');

const ZIP_PATHS = [
  'C:\\Users\\steve\\Downloads\\MEDICINE 1 .zip',
  'C:\\Users\\steve\\Downloads\\MEDICINE 2.zip',
  'C:\\Users\\steve\\Downloads\\SURGERY.zip',
  'C:\\Users\\steve\\Downloads\\SURGERY (1).zip',
  'C:\\Users\\steve\\Downloads\\SURGERY 2.zip',
  'C:\\Users\\steve\\Downloads\\OTHERS.zip',
];

const TITLE_RE =
  /trauma|toxicolog|poison|overdose|envenom|snake|spider|burn|drown|bite|sting|carbon monoxide|cyanide|ethylene glycol|methanol|acetaminophen overdose|salicylate|opioid overdose|organophosphate/i;

function listHtmInZip(zipPath) {
  if (!fs.existsSync(zipPath)) return [];
  const ps = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/'/g, "''")}')
$z.Entries | Where-Object { $_.Name -match '\\.htm$' -and $_.FullName -notmatch '__MACOSX' } | ForEach-Object { $_.FullName }
$z.Dispose()
`;
  const raw = execSync(`powershell -NoProfile -Command "${ps.replace(/\r?\n/g, '; ')}"`, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.endsWith('.htm'));
}

function readHtmFromZip(zipPath, entry) {
  const ps = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/'/g, "''")}')
$e = $z.Entries | Where-Object { $_.FullName -eq '${entry.replace(/'/g, "''")}' }
if ($e) {
  $sr = New-Object System.IO.StreamReader($e.Open())
  $sr.ReadToEnd()
  $sr.Close()
}
$z.Dispose()
`;
  try {
    return execSync(`powershell -NoProfile -Command "${ps.replace(/\r?\n/g, ' ')}"`, {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch {
    return '';
  }
}

function extractTitle(html) {
  const m =
    html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
    html.match(/Question\s*#?\s*(\d+)/i) ||
    html.match(/class="[^"]*question[^"]*"[^>]*>([^<]{8,120})/i);
  return (m?.[1] || '').replace(/\s+/g, ' ').trim();
}

const candidates = [];

for (const zipPath of ZIP_PATHS) {
  const entries = listHtmInZip(zipPath);
  console.log(`${path.basename(zipPath)}: ${entries.length} htm — scanning titles…`);
  let scanned = 0;
  for (const entry of entries) {
    if (scanned > 400) break;
    scanned += 1;
    const html = readHtmFromZip(zipPath, entry);
    if (!html || html.length < 200) continue;
    const title = extractTitle(html);
    const blob = `${title} ${entry}`;
    if (!TITLE_RE.test(blob)) continue;
    candidates.push({
      zip: path.basename(zipPath),
      entry,
      title: title || entry,
    });
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  outJson,
  JSON.stringify(
    {
      scannedAt: new Date().toISOString(),
      count: candidates.length,
      candidates,
    },
    null,
    2,
  ),
);

console.log(`\nWrote ${candidates.length} candidates → ${outJson}`);
for (const c of candidates.slice(0, 12)) {
  console.log(`  · ${c.title} (${c.zip})`);
}
